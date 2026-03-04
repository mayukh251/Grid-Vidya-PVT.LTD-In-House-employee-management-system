import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import { signSessionToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { loginSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await writeAuditLog({
      action: "AUTH_LOGIN_FAILED",
      meta: { email, reason: "not_found" },
    });

    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) {
    await writeAuditLog({
      userId: user.id,
      action: "AUTH_LOGIN_FAILED",
      meta: { email, reason: "bad_password" },
    });

    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const token = signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const response = NextResponse.json(
    {
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        managerId: user.managerId,
      },
    },
    { status: 200 },
  );

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  await writeAuditLog({
    userId: user.id,
    action: "AUTH_LOGIN_SUCCESS",
    meta: { email: user.email },
  });

  return response;
}


