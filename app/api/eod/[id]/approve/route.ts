import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { eodApproveSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
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

  const parsed = eodApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const report = await prisma.eodReport.update({
      where: { id },
      data: {
        status: parsed.data.status,
        approvedById: auth.user.id,
        approvedAt: new Date(),
        managerComment: parsed.data.managerComment ?? null,
        managerRating: parsed.data.managerRating ?? undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (parsed.data.managerComment) {
      await prisma.eodComment.create({
        data: {
          eodReportId: id,
          authorId: auth.user.id,
          comment: parsed.data.managerComment,
        },
      });
    }

    await writeAuditLog({
      userId: auth.user.id,
      action: "EOD_REVIEWED",
      meta: {
        eodId: id,
        status: parsed.data.status,
        managerRating: parsed.data.managerRating ?? null,
      },
    });

    return NextResponse.json({ eod: report }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "EOD report not found" }, { status: 404 });
    }
    throw error;
  }
}
