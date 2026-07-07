import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { sendOrderNotification } from "@/lib/mailer";
import { sendPushNotification, type PushPayload } from "@/lib/push";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const snap = await adminDb.collection("orders").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = snap.data()!;
    return NextResponse.json({
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    const validStatuses = ["pending", "confirmed", "ready", "picked_up", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const orderDoc = await adminDb.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }
    const orderData = orderDoc.data()!;

    const statusTimestamps: Record<string, string> = {
      confirmed: "confirmedAt",
      ready: "readyAt",
      picked_up: "pickedUpAt",
      cancelled: "cancelledAt",
    };
    const updateData: Record<string, unknown> = { status };
    if (statusTimestamps[status]) {
      updateData[statusTimestamps[status]] = new Date();
    }
    await adminDb.collection("orders").doc(id).update(updateData);

    // Refund wallet if cancelled and paid by wallet
    let refunded = false;
    if (status === "cancelled" && orderData.paymentMethod === "wallet" && orderData.studentId && orderData.totalPrice > 0) {
      try {
        const walletRef = adminDb.collection("wallets").doc(orderData.studentId);
        const walletDoc = await walletRef.get();
        if (walletDoc.exists) {
          const currentBalance = walletDoc.data()!.balance || 0;
          const newBalance = currentBalance + orderData.totalPrice;
          await walletRef.update({ balance: newBalance, updatedAt: new Date().toISOString() });
          await adminDb.collection("wallet_transactions").doc().set({
            studentId: orderData.studentId,
            amount: orderData.totalPrice,
            type: "refund",
            method: "wallet",
            note: `訂單 #${orderData.orderNumber} 取消退款`,
            balanceAfter: newBalance,
            createdAt: new Date().toISOString(),
            createdBy: "system",
          });
          refunded = true;
        }
      } catch (err) {
        console.error("Wallet refund error:", err);
      }
    }

    // Send notifications based on user preference
    if (["confirmed", "ready", "cancelled"].includes(status)) {
      const statusLabels: Record<string, string> = {
        confirmed: "準備中",
        ready: "可取餐",
        cancelled: "已取消",
      };
      const cancelMsg = refunded
        ? `很抱歉，您的訂單已被取消。$${orderData.totalPrice} 已退回錢包`
        : "很抱歉，您的訂單已被取消";
      const statusMessages: Record<string, string> = {
        confirmed: "店家已確認您的訂單，正在準備中",
        ready: "餐點已準備好，請盡快前往取餐",
        cancelled: cancelMsg,
      };
      const displayNum = orderData.orderNumber?.length > 6
        ? orderData.orderNumber.slice(-4)
        : orderData.orderNumber;
      const deptLabel = orderData.department === "breakfast" ? "早餐部" : "午餐部";
      const itemsSummary = orderData.items.map((i: { name: string; quantity: number }) => `${i.name}x${i.quantity}`).join("、");

      // Look up student's notification preference
      const studentDoc = await adminDb.collection("students").doc(orderData.studentId).get();
      const notifyMethod = studentDoc.exists ? (studentDoc.data()?.notifyMethod || "email") : "email";

      // Push notification (only if preference is "push")
      if (notifyMethod === "push") {
        try {
          const pushDoc = await adminDb.collection("push_subscriptions").doc(orderData.studentId).get();
          if (pushDoc.exists) {
            const { subscription } = pushDoc.data()!;
            const statusIcon: Record<string, string> = {
              confirmed: "\u{1F373}",
              ready: "✅",
              cancelled: "❌",
            };
            const payload: PushPayload = {
              title: `${statusIcon[status] || ""} #${displayNum} ${statusLabels[status]}`,
              body: `${statusMessages[status]}\n${deptLabel} | ${itemsSummary}`,
              orderNumber: orderData.orderNumber,
              orderId: id,
              status,
            };
            const pushResult = await sendPushNotification(subscription, payload);
            if (pushResult.reason === "subscription_expired") {
              await adminDb.collection("push_subscriptions").doc(orderData.studentId).delete();
            }
          }
        } catch (err) {
          console.error("Push notification error:", err);
        }
      }

      // Email notification (only if preference is "email" or not set)
      if (notifyMethod === "email" || !notifyMethod) {
        try {
          const email = studentDoc.exists ? studentDoc.data()?.email : null;
          if (email) {
            await sendOrderNotification({
              to: email,
              studentName: orderData.studentName || "",
              orderNumber: orderData.orderNumber,
              status,
              department: orderData.department,
              items: orderData.items,
              totalPrice: orderData.totalPrice,
            });
          }
        } catch (err) {
          console.error("Email notification error:", err);
        }
      }
      // notifyMethod === "none" → no notification sent
    }

    return NextResponse.json({ id, status });
  } catch (err) {
    console.error("PATCH /api/orders/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
