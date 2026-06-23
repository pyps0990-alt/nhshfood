import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { z } from "zod";

const DOC_PATH = "settings/pickupSlots";

const DEFAULT_SLOTS = {
  breakfast: ["盡快取餐", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"],
  lunch: ["11:30", "12:00", "12:10", "12:20", "12:30", "12:40", "12:50", "13:00"],
};

export async function GET() {
  try {
    const doc = await adminDb.doc(DOC_PATH).get();
    if (!doc.exists) {
      return NextResponse.json(DEFAULT_SLOTS);
    }
    const data = doc.data()!;
    return NextResponse.json({
      breakfast: data.breakfast || DEFAULT_SLOTS.breakfast,
      lunch: data.lunch || DEFAULT_SLOTS.lunch,
    });
  } catch (err) {
    console.error("GET /api/settings/pickup-slots error:", err);
    return NextResponse.json(DEFAULT_SLOTS);
  }
}

const updateSchema = z.object({
  breakfast: z.array(z.string().max(20)).min(1).max(30),
  lunch: z.array(z.string().max(20)).min(1).max(30),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
    }

    await adminDb.doc(DOC_PATH).set({
      breakfast: parsed.data.breakfast,
      lunch: parsed.data.lunch,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/settings/pickup-slots error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
