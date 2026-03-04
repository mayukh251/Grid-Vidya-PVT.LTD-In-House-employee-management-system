import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const protectedPaths = [
  "/dashboard",
  "/api/time",
  "/api/eod",
  "/api/todos",
  "/api/calendar",
  "/api/performance",
  "/api/leaderboard",
  "/api/motivations",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isApiPath = pathname.startsWith("/api/");

  if (isProtected && !token) {
    if (isApiPath) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/api/time/:path*",
    "/api/eod/:path*",
    "/api/todos/:path*",
    "/api/calendar/:path*",
    "/api/performance/:path*",
    "/api/leaderboard/:path*",
    "/api/motivations/:path*",
  ],
};


