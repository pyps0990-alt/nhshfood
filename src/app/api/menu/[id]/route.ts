import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth";

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
    const allowedFields = ["name", "price", "category", "department", "description", "imageUrl", "available"];
    const update: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in body) {
        if (key === "price") {
          update[key] = Math.round(Number(body[key]));
        } else if (key === "available") {
          update[key] = Boolean(body[key]);
        } else if (key === "department") {
          update[key] = body[key] === "lunch" ? "lunch" : "breakfast";
        } else if (typeof body[key] === "string") {
          update[key] = body[key].replace(/[<>]/g, "").trim().slice(0, 200);
        } else {
          update[key] = body[key];
        }
      }
    }

    await adminDb.collection("menuItems").doc(id).update(update);
    return NextResponse.json({ id, ...update });
  } catch (err) {
    console.error("PATCH /api/menu/[id] error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
