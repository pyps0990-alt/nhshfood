import { adminDb } from "./firebase-admin";
import { sendOrderNotification } from "./mailer";
import { sendPushNotification, type PushPayload } from "./push";

const STATUS_LABEL: Record<string, string> = {
  pending: "訂單已收到", confirmed: "準備中", ready: "可取餐", cancelled: "已取消",
};
const STATUS_ICON: Record<string, string> = {
  pending: "\u{1F9FE}", confirmed: "\u{1F373}", ready: "✅", cancelled: "❌",
};

/** Notify the student per their preference. Never throws. */
export async function notifyOrderStatus(
  orderId: string,
  order: FirebaseFirestore.DocumentData,
  status: string,
  refunded = 0
): Promise<void> {
  if (!["pending", "confirmed", "ready", "cancelled"].includes(status)) return;
  if (!order.studentId || order.studentId === "POS") return;
  try {
    const messages: Record<string, string> = {
      pending: "我們已收到您的訂單",
      confirmed: "店家已確認您的訂單，正在準備中",
      ready: "餐點已準備好，請盡快前往取餐",
      cancelled: refunded > 0 ? `很抱歉，您的訂單已被取消。$${refunded} 已退回錢包` : "很抱歉，您的訂單已被取消",
    };
    const displayNum = String(order.orderNumber || "").slice(-4);
    const deptLabel = order.department === "breakfast" ? "早餐部" : "午餐部";
    const items: { name: string; quantity: number; price: number }[] = order.items || [];
    const summary = items.map((i) => `${i.name}x${i.quantity}`).join("、");

    const studentDoc = await adminDb.collection("students").doc(order.studentId).get();
    const method = (studentDoc.exists && studentDoc.data()?.notifyMethod) || "email";

    if (method === "push") {
      const pushDoc = await adminDb.collection("push_subscriptions").doc(order.studentId).get();
      if (pushDoc.exists) {
        const payload: PushPayload = {
          title: `${STATUS_ICON[status] || ""} #${displayNum} ${STATUS_LABEL[status]}`,
          body: `${messages[status]}\n${deptLabel} | ${summary}`,
          orderNumber: order.orderNumber,
          orderId,
          status,
        };
        const r = await sendPushNotification(pushDoc.data()!.subscription, payload);
        if (r.reason === "subscription_expired") {
          await adminDb.collection("push_subscriptions").doc(order.studentId).delete();
        }
      }
    } else if (method === "email") {
      const email = studentDoc.exists ? studentDoc.data()?.email : null;
      if (email) {
        await sendOrderNotification({
          to: email,
          studentName: order.studentName || "",
          orderNumber: order.orderNumber,
          status,
          department: order.department,
          items,
          totalPrice: order.totalPrice,
        });
      }
    }
  } catch (err) {
    console.error("notifyOrderStatus error:", err);
  }
}

export async function notifyOrderPaid(orderId: string): Promise<void> {
  const snap = await adminDb.collection("orders").doc(orderId).get();
  if (snap.exists) await notifyOrderStatus(orderId, snap.data()!, "pending");
}
