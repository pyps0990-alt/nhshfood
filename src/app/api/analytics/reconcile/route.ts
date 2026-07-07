import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

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

function pad(n: number) { return String(n).padStart(2, "0"); }

function dayBounds(dateStr: string): { start: Date; end: Date } | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const start = new Date(y, mo, d, 0, 0, 0, 0);
  const end = new Date(y, mo, d, 23, 59, 59, 999);
  if (isNaN(start.getTime())) return null;
  return { start, end };
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const jar = await cookies();
  if (!jar.get("admin_token")) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const bounds = dayBounds(dateStr);
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

    const active = orders.filter((o) => o.status !== "cancelled");

    const walletOrdersTotal = active
      .filter((o) => o.paymentMethod === "wallet")
      .reduce((s, o) => s + o.totalPrice, 0);

    const cashOrdersTotal = active
      .filter((o) => o.paymentMethod === "cash")
      .reduce((s, o) => s + o.totalPrice, 0);

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

    const walletPaymentsDebited = transactions
      .filter((t) => t.type === "payment" && t.method === "wallet")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const walletTopUps = transactions
      .filter((t) => t.type === "topup")
      .reduce((s, t) => s + t.amount, 0);

    const walletRefunds = transactions
      .filter((t) => t.type === "refund")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const anomaly = walletOrdersTotal !== walletPaymentsDebited;
    const walletDiff = walletOrdersTotal - walletPaymentsDebited;

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
      walletTopUps,
      walletRefunds,
      grandTotal: walletOrdersTotal + cashOrdersTotal,
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
      lines.push(`勾稽差額 (A - B),${walletDiff}${anomaly ? "  ⚠ 異常" : ""}`);
      lines.push(`現金訂單總額,${cashOrdersTotal}`);
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
