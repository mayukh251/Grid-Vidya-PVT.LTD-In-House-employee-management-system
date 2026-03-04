import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";

const tokenSchema = z.object({
  userId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
});

export type SessionToken = z.infer<typeof tokenSchema>;

export function signSessionToken(payload: SessionToken): string {
  return jwt.sign(payload, env.JWT_SECRET as Secret, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifySessionToken(token: string): SessionToken | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET as Secret);
    return tokenSchema.parse(decoded);
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}

export async function getSessionFromCookies(): Promise<SessionToken | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}


