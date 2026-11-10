import { NextRequest, NextResponse } from "next/server";
import { createToken, adminCookieOptions, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, durableRateLimit, resetDurableRateLimit, getClientIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/security";

const schema = z.object({
  username: z.string().min(1).max(50).trim(),
  password: z.string().min(1).max(100),
});

// A real bcrypt hash used to keep timing uniform when the user doesn't exist.
let dummyHash: string | null = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync("timing-equaliser", 12);
  return dummyHash;
}

function legacySha256Matches(password: string, stored: string): boolean {
  const input = Buffer.from(createHash("sha256").update(password).digest("hex"));
  const target = Buffer.from(stored);
  return input.length === target.length && timingSafeEqual(input, target);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000).allowed) {
      return NextResponse.json({ error: "登入嘗試太頻繁，請 15 分鐘後再試" }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "請輸入帳號密碼" }, { status: 400 });
    }
    const { username, password } = parsed.data;

    // Durable limits shared by all serverless instances.
    const [byIp, byUser] = await Promise.all([
      durableRateLimit(`admin-login:ip:${ip}`, 20, 15 * 60 * 1000),
      durableRateLimit(`admin-login:user:${username.toLowerCase()}`, 8, 15 * 60 * 1000),
    ]);
    if (!byIp.allowed || !byUser.allowed) {
      return NextResponse.json({ error: "登入嘗試太頻繁，請 15 分鐘後再試" }, { status: 429 });
    }

    const snap = await adminDb.collection("admins").where("username", "==", username).limit(1).get();
    const doc = snap.empty ? null : snap.docs[0];
    const stored: string = doc?.data().passwordHash || "";

    let ok = false;
    let needsUpgrade = false;
    if (stored.startsWith("$2")) {
      ok = await bcrypt.compare(password, stored);
    } else if (/^[0-9a-f]{64}$/i.test(stored)) {
      ok = legacySha256Matches(password, stored);
      needsUpgrade = ok;
    } else {
      await bcrypt.compare(password, getDummyHash());
    }

    if (!doc || !ok || doc.data().disabled === true) {
      await auditLog({ actor: username, action: "admin.login_failed", ip });
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    if (needsUpgrade) {
      await doc.ref.update({
        passwordHash: await bcrypt.hash(password, 12),
        passwordUpgradedAt: new Date().toISOString(),
      }).catch((e) => console.error("admin hash upgrade failed:", e));
    }
    await doc.ref.update({ lastLoginAt: new Date().toISOString(), lastLoginIp: ip }).catch(() => {});
    await resetDurableRateLimit(`admin-login:user:${username.toLowerCase()}`);
    await auditLog({ actor: username, action: "admin.login", ip });

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE_NAME, await createToken(username), adminCookieOptions());
    return res;
  } catch (err) {
    console.error("POST /api/auth error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", adminCookieOptions(0));
  return res;
}
