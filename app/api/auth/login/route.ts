import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
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

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  console.log("LOGIN ATTEMPT", email);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log("USER FOUND", user?.email ?? null);

    if (!user) {
      await writeAuditLog({
        action: "AUTH_LOGIN_FAILED",
        meta: { email, reason: "not_found" },
      });

      return NextResponse.json(
        { error: "Invalid credentials", message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log("PASSWORD VALID", valid);

    if (!valid) {
      await writeAuditLog({
        userId: user.id,
        action: "AUTH_LOGIN_FAILED",
        meta: { email, reason: "bad_password" },
      });

      return NextResponse.json(
        { error: "Invalid credentials", message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is missing");
      return NextResponse.json(
        { error: "Server configuration error", message: "Server configuration error" },
        { status: 500 },
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "8h" },
    );

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
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
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return NextResponse.json(
      { error: "Unable to sign in", message: "Unable to sign in" },
      { status: 500 },
    );
  }
}


