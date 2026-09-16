import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-token";

const PUBLIC_PATHS = new Set(["/login"]);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // AtomS3 device ingestion is authenticated via x-api-key in the route handler.
  if (pathname === "/api/readings" && req.method === "POST") {
    return NextResponse.next();
  }

  const hasValidSession = isValidSessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!hasValidSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
