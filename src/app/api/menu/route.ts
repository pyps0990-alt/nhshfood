import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get("department");
    const includeAll = req.nextUrl.searchParams.get("all") === "true";

    let q: FirebaseFirestore.Query = adminDb.collection("menuItems");
    if (department) q = q.where("department", "==", department);

    const snap = await q.get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!includeAll) {
      items = items.filter((i: Record<string, unknown>) => i.available === true);
    }

    items.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      ((a.category as string) || "").localeCompare((b.category as string) || "")
    );

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/menu error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only admins can add menu items
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const body = await req.json();

    // Validate
    if (!body.name || !body.category || !body.department) {
      return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
    }

    if (typeof body.price !== "number" || body.price < 0 || body.price > 10000) {
      return NextResponse.json({ error: "價格無效" }, { status: 400 });
    }

    const sanitize = (s: string | null | undefined) =>
      s ? s.replace(/[<>]/g, "").trim().slice(0, 200) : null;

    const ref = await adminDb.collection("menuItems").add({
      name: sanitize(body.name)!,
      price: Math.round(body.price),
      category: sanitize(body.category)!,
      department: body.department === "lunch" ? "lunch" : "breakfast",
      description: sanitize(body.description),
      imageUrl: body.imageUrl || null,
      available: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/menu error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
