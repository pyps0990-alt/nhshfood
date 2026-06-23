import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";
import { invalidateMenuCache } from "@/lib/menu-cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can update menu items
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();

    // Only allow specific fields to be updated
    const allowedFields = ["name", "price", "category", "department", "description", "imageUrl", "available", "tags", "stock", "soldOut"];
    const update: Record<string, unknown> = {};
    const validTags = ["promotion", "seasonal", "daily_special"];

    for (const key of allowedFields) {
      if (key in body) {
        if (key === "price") {
          update[key] = Math.round(Number(body[key]));
        } else if (key === "available" || key === "soldOut") {
          update[key] = Boolean(body[key]);
        } else if (key === "department") {
          update[key] = body[key] === "lunch" ? "lunch" : "breakfast";
        } else if (key === "tags") {
          update[key] = Array.isArray(body[key])
            ? body[key].filter((t: string) => validTags.includes(t))
            : [];
        } else if (key === "stock") {
          update[key] = typeof body[key] === "number" && body[key] >= 0
            ? Math.round(body[key])
            : null;
        } else if (typeof body[key] === "string") {
          update[key] = body[key].replace(/[<>]/g, "").trim().slice(0, 200);
        } else {
          update[key] = body[key];
        }
      }
    }

    await adminDb.collection("menuItems").doc(id).update(update);

    // Invalidate menu cache after updating
    invalidateMenuCache();

    return NextResponse.json({ id, ...update });
  } catch (err) {
    console.error("PATCH /api/menu/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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

    await adminDb.collection("menuItems").doc(id).delete();
    invalidateMenuCache();

    return NextResponse.json({ id, deleted: true });
  } catch (err) {
    console.error("DELETE /api/menu/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
