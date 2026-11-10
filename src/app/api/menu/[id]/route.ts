import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth";
import { menuUpdateSchema } from "@/lib/schemas/menu";
import { auditLog } from "@/lib/security";
import { invalidateMenuCache } from "@/lib/menu-cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const parsed = menuUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "資料格式錯誤" }, { status: 400 });
    }
    const update: Record<string, unknown> = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );
    // Restocking an item that auto-sold-out should make it orderable again.
    if (typeof update.stock === "number" && update.stock > 0 && update.soldOut === undefined) {
      update.soldOut = false;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "沒有需要更新的資料" }, { status: 400 });
    }

    await adminDb.collection("menuItems").doc(id).update(update);
    await auditLog({ actor: auth.username, action: "menu.update", target: id, detail: update });

    // Invalidate in-memory cache + purge the edge/CDN cache
    invalidateMenuCache();
    try { revalidatePath("/api/menu"); } catch {}

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
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await adminDb.collection("menuItems").doc(id).delete();
    await auditLog({ actor: auth.username, action: "menu.delete", target: id });
    invalidateMenuCache();
    try { revalidatePath("/api/menu"); } catch {}

    return NextResponse.json({ id, deleted: true });
  } catch (err) {
    console.error("DELETE /api/menu/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
