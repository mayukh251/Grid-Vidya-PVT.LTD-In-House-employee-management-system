import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const tokenSchema = z.object({
  userId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
});

export type SessionToken = z.infer<typeof tokenSchema>;

function getJwtSecret(): Secret | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return secret as Secret;
}

function getJwtExpiresIn(): SignOptions["expiresIn"] {
  return (process.env.JWT_EXPIRES_IN ?? "8h") as SignOptions["expiresIn"];
}

export function signSessionToken(payload: SessionToken): string {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(payload, secret, {
    expiresIn: getJwtExpiresIn(),
  } as SignOptions);
}

export function verifySessionToken(token: string): SessionToken | null {
  try {
    const secret = getJwtSecret();
    if (!secret) {
      return null;
    }

    const decoded = jwt.verify(token, secret);
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

