import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1 || q.length > 20) {
      return NextResponse.json({ error: "請輸入訂單編號" }, { status: 400 });
    }

    // Today's date prefix
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayPrefix = `${yyyy}${mm}${dd}`;

    let orderNumber: string;
    if (q.length <= 4) {
      // User entered last 4 digits — prepend today's date
      orderNumber = `${todayPrefix}${q.padStart(4, "0")}`;
    } else {
      orderNumber = q;
    }

    // Query by orderNumber
    const snap = await adminDb
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "找不到此訂單" }, { status: 404 });
    }

    const doc = snap.docs[0];
    return NextResponse.json({ id: doc.id, orderNumber: doc.data().orderNumber });
  } catch (err) {
    console.error("GET /api/orders/lookup error:", err);
    return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
  }
}
