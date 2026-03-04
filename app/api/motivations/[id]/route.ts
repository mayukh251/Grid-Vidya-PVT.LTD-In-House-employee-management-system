import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { motivationUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  if (!requireRole(auth.user.role, "MANAGER")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = motivationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const motivation = await prisma.motivation.update({
      where: { id },
      data: {
        weekday: parsed.data.weekday,
        text: parsed.data.text,
        active: parsed.data.active ?? true,
        updatedById: auth.user.id,
      },
    });

    await writeAuditLog({
      userId: auth.user.id,
      action: "MOTIVATION_UPDATED",
      meta: {
        motivationId: id,
        weekday: motivation.weekday,
        active: motivation.active,
      },
    });

    return NextResponse.json({ motivation }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Motivation not found" }, { status: 404 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Motivation for this weekday already exists" },
        { status: 409 },
      );
    }
    throw error;
  }
}
