import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

const DOC_ID = "app-config";
const COLLECTION = "settings";

const DEFAULTS = {
  requireLocation: true,
  requireSchoolEmail: true,
};

export async function GET() {
  try {
    const snap = await adminDb.collection(COLLECTION).doc(DOC_ID).get();
    return NextResponse.json(
      { ...DEFAULTS, ...snap.data() },
      // Never cache: this drives a security check (location gate). If admins
      // flip requireLocation, every client + edge node must see it immediately.
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch (err) {
    console.error("GET /api/settings/app-config error:", err);
    return NextResponse.json(DEFAULTS, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
}

export async function PUT(req: NextRequest) {
  const jar = await cookies();
  const session = jar.get("admin_token");
  if (!session) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const update: Record<string, boolean> = {};
    if (typeof body.requireLocation === "boolean") update.requireLocation = body.requireLocation;
    if (typeof body.requireSchoolEmail === "boolean") update.requireSchoolEmail = body.requireSchoolEmail;

    await adminDb.collection(COLLECTION).doc(DOC_ID).set(update, { merge: true });
    const snap = await adminDb.collection(COLLECTION).doc(DOC_ID).get();
    return NextResponse.json({ ...DEFAULTS, ...snap.data() });
  } catch (err) {
    console.error("PUT /api/settings/app-config error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
