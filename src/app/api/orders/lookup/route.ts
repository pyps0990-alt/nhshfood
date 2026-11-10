import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, getStudentSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { taipeiDateKey } from "@/lib/time";

// Look up an order by its number (or last 4 digits for today).
// Students can only find their own orders; admins can find any.
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    if (!/^\d{1,12}$/.test(q)) {
      return NextResponse.json({ error: "請輸入訂單編號數字" }, { status: 400 });
    }

    const [admin, student] = await Promise.all([getSession(), getStudentSession()]);
    if (!admin && !student) {
      return NextResponse.json({ error: "請先登入後再查詢訂單" }, { status: 401 });
    }
    const who = admin?.username || student!.studentId;
    if (!rateLimit(`lookup:${who}`, 30, 60 * 1000).allowed) {
      return NextResponse.json({ error: "查詢太頻繁" }, { status: 429 });
    }

    const orderNumber = q.length <= 4 ? `${taipeiDateKey()}${q.padStart(4, "0")}` : q;
    const snap = await adminDb.collection("orders").where("orderNumber", "==", orderNumber).limit(1).get();
    const doc = snap.empty ? null : snap.docs[0];

    if (!doc || (!admin && doc.data().studentId !== student!.studentId)) {
      return NextResponse.json({ error: "找不到此訂單" }, { status: 404 });
    }
    return NextResponse.json({ id: doc.id, orderNumber: doc.data().orderNumber });
  } catch (err) {
    console.error("GET /api/orders/lookup error:", err);
    return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
  }
}
