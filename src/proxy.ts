import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ADMIN_COOKIE_NAME } from "@/lib/tokens";

// Routes that receive cross-site POSTs from ECPay's servers / payment page.
// They authenticate via CheckMacValue instead of cookies.
const CROSS_SITE_ALLOWED = ["/api/payments/ecpay/notify", "/api/payments/ecpay/result"];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  // No Origin header (some same-origin GET→POST navigations, old browsers):
  // fall back to Fetch Metadata.
  const site = req.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CSRF defence for the API ──
  if (pathname.startsWith("/api/")) {
    if (MUTATING.has(req.method) && !CROSS_SITE_ALLOWED.includes(pathname) && !sameOrigin(req)) {
      return NextResponse.json({ error: "來源不允許" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ── Admin pages ──
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.set(ADMIN_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*", "/receiver/:path*", "/api/:path*"],
};
