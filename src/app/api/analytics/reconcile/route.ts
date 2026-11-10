import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth";
import { csvEscape } from "@/lib/security";
import { taipeiDayBounds, taipeiIsoDate } from "@/lib/time";

// Daily three-way reconciliation for accounting.
//
// Compares three independently-computed totals for a single day:
//   A) Sum of orders.totalPrice where paymentMethod = "wallet" & not cancelled
//   B) Sum of wallet_transactions where type = "payment" (negated to positive)
//   C) Sum of orders.totalPrice where paymentMethod = "cash" & not cancelled
//
// Any mismatch between A and B is flagged as an anomaly — that's the invariant
// the accounting office cares about (wallet debited ↔ order recorded). C is a
// separate line for cash-basis reconciliation with the on-site cashier.

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") || taipeiIsoDate();

  const bounds = taipeiDayBounds(dateStr);
  if (!bounds) {
    return NextResponse.json({ error: "日期格式錯誤，需為 YYYY-MM-DD" }, { status: 400 });
  }

  const format = url.searchParams.get("format") || "json";

  try {
    // ── Fetch the day's orders ──────────────────────────────────
    const ordersSnap = await adminDb.collection("orders")
      .where("createdAt", ">=", bounds.start)
      .where("createdAt", "<=", bounds.end)
      .get();

    type OrderRow = {
      id: string;
      orderNumber: string;
      studentId: string;
      studentName: string | null;
      department: string;
      paymentMethod: string;
      status: string;
      totalPrice: number;
      createdAt: string;
    };

    const orders: OrderRow[] = ordersSnap.docs.map((d) => {
      const r = d.data();
      const t = r.createdAt?.toDate?.() ?? new Date();
      return {
        id: d.id,
        orderNumber: r.orderNumber || d.id,
        studentId: r.studentId,
        studentName: r.studentName || null,
        department: r.department,
        paymentMethod: r.paymentMethod || "cash",
        status: r.status || "pending",
        totalPrice: r.totalPrice || 0,
        createdAt: t instanceof Date ? t.toISOString() : new Date().toISOString(),
      };
    });

    // Only orders that became real sales. awaiting_payment / payment_failed
    // are online-payment attempts that never completed.
    const active = orders.filter(
      (o) => !["cancelled", "awaiting_payment", "payment_failed"].includes(o.status)
    );

    const walletOrdersTotal = active
      .filter((o) => o.paymentMethod === "wallet")
      .reduce((s, o) => s + o.totalPrice, 0);

    const cashOrdersTotal = active
      .filter((o) => o.paymentMethod === "cash")
      .reduce((s, o) => s + o.totalPrice, 0);

    const ecpayOrdersTotal = active
      .filter((o) => o.paymentMethod === "ecpay")
      .reduce((s, o) => s + o.totalPrice, 0);

    // Gateway side: what ECPay actually confirmed as paid today.
    const paySnap = await adminDb.collection("payments")
      .where("paidAt", ">=", bounds.start.toISOString())
      .where("paidAt", "<=", bounds.end.toISOString())
      .get();
    const gatewayPaid = paySnap.docs.map((d) => d.data());
    const ecpayGatewayOrders = gatewayPaid
      .filter((p) => p.purpose === "order")
      .reduce((s, p) => s + (p.amount || 0), 0);
    const ecpayGatewayTopUps = gatewayPaid
      .filter((p) => p.purpose === "top_up")
      .reduce((s, p) => s + (p.amount || 0), 0);

    // ── Fetch the day's wallet-payment transactions ────────────
    const startISO = bounds.start.toISOString();
    const endISO = bounds.end.toISOString();
    const txSnap = await adminDb.collection("wallet_transactions")
      .where("createdAt", ">=", startISO)
      .where("createdAt", "<=", endISO)
      .get();

    type TxRow = {
      id: string;
      studentId: string;
      amount: number;
      type: string;
      method: string;
      balanceAfter: number;
      createdAt: string;
      note: string | null;
    };

    const transactions: TxRow[] = txSnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        studentId: r.studentId,
        amount: r.amount || 0,
        type: r.type || "unknown",
        method: r.method || "unknown",
        balanceAfter: r.balanceAfter || 0,
        createdAt: r.createdAt || "",
        note: r.note || null,
      };
    });

    const walletPaymentsGross = transactions
      .filter((t) => t.type === "payment" && t.method === "wallet")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Refunds of cancelled wallet orders (method "wallet") offset the debit,
    // so A and B stay comparable when an order is cancelled.
    const walletOrderRefunds = transactions
      .filter((t) => t.type === "refund" && t.method === "wallet")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const walletPaymentsDebited = walletPaymentsGross - walletOrderRefunds;

    const walletTopUps = transactions
      .filter((t) => t.type === "top_up")
      .reduce((s, t) => s + t.amount, 0);

    const walletRefunds = transactions
      .filter((t) => t.type === "refund" && t.method === "cash_refund")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const ecpayRefundedToWallet = transactions
      .filter((t) => t.type === "refund" && t.method === "ecpay_to_wallet")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const walletDiff = walletOrdersTotal - walletPaymentsDebited;
    // Note: ECPay orders placed today are confirmed today in the common case;
    // a small diff can occur around midnight.
    const ecpayDiff = ecpayOrdersTotal - (ecpayGatewayOrders - ecpayRefundedToWallet);
    const anomaly = walletDiff !== 0 || ecpayDiff !== 0;

    const summary = {
      date: dateStr,
      generatedAt: new Date().toISOString(),
      totalOrders: active.length,
      cancelledOrders: orders.length - active.length,
      walletOrdersTotal,
      walletPaymentsDebited,
      walletDiff,
      anomaly,
      cashOrdersTotal,
      ecpayOrdersTotal,
      ecpayGatewayOrders,
      ecpayGatewayTopUps,
      ecpayDiff,
      walletTopUps,
      walletRefunds,
      grandTotal: walletOrdersTotal + cashOrdersTotal + ecpayOrdersTotal,
    };

    if (format === "csv") {
      const lines: string[] = [];
      // Header — human-readable Chinese summary block for accountants
      lines.push("內湖高中熱食部 每日對帳報表");
      lines.push(`日期,${csvEscape(dateStr)}`);
      lines.push(`產表時間,${csvEscape(new Date().toISOString())}`);
      lines.push("");
      lines.push("項目,金額 / 筆數");
      lines.push(`有效訂單總筆數,${summary.totalOrders}`);
      lines.push(`取消訂單筆數,${summary.cancelledOrders}`);
      lines.push(`錢包扣款訂單總額 (A),${walletOrdersTotal}`);
      lines.push(`錢包實際扣款總額 (B),${walletPaymentsDebited}`);
      lines.push(`勾稽差額 (A - B),${walletDiff}${walletDiff !== 0 ? "  ⚠ 異常" : ""}`);
      lines.push(`現金訂單總額,${cashOrdersTotal}`);
      lines.push(`綠界訂單總額 (C),${ecpayOrdersTotal}`);
      lines.push(`綠界實收訂單款 (D),${ecpayGatewayOrders}`);
      lines.push(`綠界勾稽差額 (C - D + 轉錢包退款),${ecpayDiff}${ecpayDiff !== 0 ? "  ⚠ 異常" : ""}`);
      lines.push(`綠界線上儲值總額,${ecpayGatewayTopUps}`);
      lines.push(`當日儲值總額,${walletTopUps}`);
      lines.push(`當日退費總額,${walletRefunds}`);
      lines.push(`熱食部應收總額,${summary.grandTotal}`);
      lines.push("");
      lines.push("");
      lines.push("── 訂單明細 ──");
      lines.push("訂單編號,學號,姓名,部門,付款方式,狀態,金額,建立時間");
      for (const o of orders) {
        lines.push([
          o.orderNumber,
          o.studentId,
          o.studentName || "",
          o.department,
          o.paymentMethod,
          o.status,
          o.totalPrice,
          o.createdAt,
        ].map(csvEscape).join(","));
      }
      lines.push("");
      lines.push("── 錢包交易明細 ──");
      lines.push("交易編號,學號,金額,類型,方式,交易後餘額,建立時間,備註");
      for (const t of transactions) {
        lines.push([
          t.id,
          t.studentId,
          t.amount,
          t.type,
          t.method,
          t.balanceAfter,
          t.createdAt,
          t.note || "",
        ].map(csvEscape).join(","));
      }

      const csv = "﻿" + lines.join("\r\n"); // BOM so Excel opens as UTF-8

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reconcile-${dateStr}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { summary, orders, transactions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/analytics/reconcile error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
