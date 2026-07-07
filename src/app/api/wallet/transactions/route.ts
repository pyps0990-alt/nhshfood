import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, getStudentSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const querySchema = z.object({
  studentId: z.string().min(1).max(20).trim(),
});

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const typeLabel: Record<string, string> = {
  top_up: "儲值",
  payment: "付款",
  refund: "退款",
};
const methodLabel: Record<string, string> = {
  cash: "現金",
  bank_transfer: "銀行轉帳",
  admin_adjustment: "管理員調整",
  wallet: "錢包扣款",
  cash_refund: "現金退費",
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(ip, 30, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  const parsed = querySchema.safeParse({ studentId });
  if (!parsed.success) {
    return NextResponse.json({ error: "請提供有效的學號" }, { status: 400 });
  }

  const format = req.nextUrl.searchParams.get("format") || "json";

  // CSV export is admin-only (contains full history for refund reconciliation).
  const adminSession = await getSession();
  if (format === "csv") {
    if (!adminSession) {
      return NextResponse.json({ error: "請先登入管理員帳號" }, { status: 401 });
    }
  } else {
    // JSON reads: caller can only see own transactions (unless admin).
    if (!adminSession) {
      const studentSession = await getStudentSession();
      if (!studentSession) {
        return NextResponse.json({ error: "請先登入" }, { status: 401 });
      }
      if (studentSession.studentId !== parsed.data.studentId) {
        return NextResponse.json({ error: "無權查詢他人交易紀錄" }, { status: 403 });
      }
    }
  }

  try {
    const snap = await adminDb
      .collection("wallet_transactions")
      .where("studentId", "==", parsed.data.studentId)
      .get();

    const all: Record<string, unknown>[] = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .sort((a, b) => {
        const ta = String((a as Record<string, unknown>).createdAt || "");
        const tb = String((b as Record<string, unknown>).createdAt || "");
        return tb.localeCompare(ta);
      });

    if (format === "csv") {
      const lines: string[] = [];
      lines.push("內湖高中熱食部 錢包完整歷史");
      lines.push(`學號,${csvEscape(parsed.data.studentId)}`);
      lines.push(`匯出時間,${csvEscape(new Date().toISOString())}`);
      lines.push(`總筆數,${all.length}`);
      lines.push("");
      lines.push("交易編號,金額,類型,方式,交易後餘額,備註,退費碼,建立時間,經手人");
      for (const t of all) {
        lines.push([
          t.id,
          t.amount,
          typeLabel[String(t.type)] || t.type,
          methodLabel[String(t.method)] || t.method,
          t.balanceAfter,
          t.note || "",
          t.refundCode || "",
          t.createdAt,
          t.createdBy || "",
        ].map(csvEscape).join(","));
      }
      const csv = "﻿" + lines.join("\r\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wallet-${parsed.data.studentId}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(all.slice(0, 50));
  } catch (error) {
    console.error("Transactions GET error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
