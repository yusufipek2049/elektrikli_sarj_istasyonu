import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const isDashboard = (p: string) => p.startsWith("/dashboard");
const isCustomerApp = (p: string) => p.startsWith("/app");

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (!isDashboard(p) && !isCustomerApp(p)) return NextResponse.next();

  const token = req.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/signin", req.url));

  try {
    const claims = await verifyToken(token);
    if (isDashboard(p) && claims.role !== "admin") return NextResponse.redirect(new URL("/app", req.url));
    if (isCustomerApp(p) && claims.role !== "customer") return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/signin", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*"],
};
