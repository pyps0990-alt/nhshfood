import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nhhs-food-secret-key-change-in-production"
);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // Clear invalid token
    const res = NextResponse.redirect(new URL("/admin/login", req.url));
    res.cookies.set("admin_token", "", { maxAge: 0, path: "/" });
    return res;
  }
}

export const config = {
  matcher: ["/admin", "/admin/menu", "/pos"],
};
