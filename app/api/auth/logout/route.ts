import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { extractTokenFromRequest, verifySessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  const payload = token ? verifySessionToken(token) : null;

  if (payload) {
    await writeAuditLog({
      userId: payload.userId,
      action: "AUTH_LOGOUT",
      meta: { userId: payload.userId },
    });
  }

  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return response;
}
