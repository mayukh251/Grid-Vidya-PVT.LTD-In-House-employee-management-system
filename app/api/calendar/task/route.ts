import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { todoCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function toDueDate(dateString?: string): Date | null {
  if (!dateString) {
    return null;
  }
  return new Date(`${dateString}T12:00:00.000Z`);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = todoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const assignedToId = parsed.data.assignedToId ?? auth.user.id;
  if (assignedToId !== auth.user.id && !requireRole(auth.user.role, "MANAGER")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const assignee = await prisma.user.findUnique({
    where: { id: assignedToId },
    select: { id: true },
  });
  if (!assignee) {
    return NextResponse.json({ message: "Assignee not found" }, { status: 404 });
  }

  const task = await prisma.todo.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assignedToId,
      assignedById: auth.user.id,
      dueDate: toDueDate(parsed.data.dueDate),
      status: parsed.data.status ?? "TODO",
      priority: parsed.data.priority ?? "MEDIUM",
      origin: parsed.data.origin ?? "CALENDAR",
      completionAt: parsed.data.status === "DONE" ? new Date() : null,
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
    action: "CALENDAR_TASK_CREATED",
    meta: {
      taskId: task.id,
      assignedToId,
      dueDate: task.dueDate?.toISOString() ?? null,
      status: task.status,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
