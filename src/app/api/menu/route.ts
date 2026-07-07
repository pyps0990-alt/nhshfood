import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth";
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
    if (department) q = q.where("department", "==", department);

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

    // Validate tags
    const validTags = ["promotion", "seasonal", "daily_special"];
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t: string) => validTags.includes(t))
      : [];

    const stock = typeof body.stock === "number" && body.stock >= 0
      ? Math.round(body.stock)
      : null;

    const ref = await adminDb.collection("menuItems").add({
      name: sanitize(body.name)!,
      price: Math.round(body.price),
      category: sanitize(body.category)!,
      department: body.department === "lunch" ? "lunch" : "breakfast",
      description: sanitize(body.description),
      imageUrl: body.imageUrl || null,
      available: true,
      tags,
      stock,
      soldOut: false,
      createdAt: FieldValue.serverTimestamp(),
    });

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
