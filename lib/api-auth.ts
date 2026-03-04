import type { Role, User } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { hasMinimumRole } from "@/lib/constants";
import { extractTokenFromRequest, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AuthSuccess = {
  ok: true;
  user: User;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export async function requireAuth(request: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Invalid session" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ message: "User not found" }, { status: 401 }),
    };
  }

  return { ok: true, user };
}

export function requireRole(userRole: Role, minimumRole: Role): boolean {
  return hasMinimumRole(userRole, minimumRole);
}


