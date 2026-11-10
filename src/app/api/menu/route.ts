import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/auth";
import { menuCreateSchema } from "@/lib/schemas/menu";
import { auditLog } from "@/lib/security";
import { getMenuCache, setMenuCache, invalidateMenuCache } from "@/lib/menu-cache";

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get("department");
    const includeAll = req.nextUrl.searchParams.get("all") === "true";

    const cacheKey = `${department || "all"}-${includeAll}`;
    const cached = getMenuCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
        },
      });
    }

    let q: FirebaseFirestore.Query = adminDb.collection("menuItems");
    if (department === "breakfast" || department === "lunch") q = q.where("department", "==", department);

    const snap = await q.get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!includeAll) {
      items = items.filter((i: Record<string, unknown>) => i.available === true);
    }

    items.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      ((a.category as string) || "").localeCompare((b.category as string) || "")
    );

    setMenuCache(cacheKey, items);

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("GET /api/menu error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const parsed = menuCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "資料格式錯誤" }, { status: 400 });
    }
    const d = parsed.data;

    const ref = await adminDb.collection("menuItems").add({
      name: d.name,
      price: d.price,
      category: d.category,
      department: d.department,
      description: d.description || null,
      imageUrl: d.imageUrl ?? null,
      available: true,
      tags: d.tags,
      stock: d.stock ?? null,
      soldOut: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    await auditLog({ actor: auth.username, action: "menu.create", target: ref.id, detail: { name: d.name, price: d.price } });

    // Invalidate in-memory cache + purge the edge/CDN cache so the new item
    // appears on the very first paint. (The customer view's realtime listener
    // corrects any staleness within ~1s regardless, so this is best-effort.)
    invalidateMenuCache();
    try { revalidatePath("/api/menu"); } catch {}

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/menu error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
