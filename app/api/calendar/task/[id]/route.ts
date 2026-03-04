import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { todoPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

function toDueDate(dateString?: string): Date | null | undefined {
  if (typeof dateString === "undefined") {
    return undefined;
  }
  if (dateString === "") {
    return null;
  }
  return new Date(`${dateString}T12:00:00.000Z`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = todoPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.todo.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const isManager = requireRole(auth.user.role, "MANAGER");
  const canEdit =
    isManager ||
    existing.assignedToId === auth.user.id ||
    existing.assignedById === auth.user.id;

  if (!canEdit) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.assignedToId && !isManager) {
    return NextResponse.json(
      { message: "Only managers can reassign task owners" },
      { status: 403 },
    );
  }

  try {
    const updated = await prisma.todo.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description:
          typeof parsed.data.description === "undefined"
            ? undefined
            : parsed.data.description ?? null,
        assignedToId: parsed.data.assignedToId,
        dueDate: toDueDate(parsed.data.dueDate),
        status: parsed.data.status,
        priority: parsed.data.priority,
        origin: parsed.data.origin,
        completionAt:
          parsed.data.status === "DONE"
            ? new Date()
            : parsed.data.status
              ? null
              : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
        assigner: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await writeAuditLog({
      userId: auth.user.id,
      action: "CALENDAR_TASK_UPDATED",
      meta: {
        taskId: id,
        changes: parsed.data,
      },
    });

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }
    throw error;
  }
}
