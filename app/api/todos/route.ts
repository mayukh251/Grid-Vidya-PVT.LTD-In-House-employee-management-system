import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { todoCreateSchema, todoQuerySchema } from "@/lib/validation";
import { toDateOnly } from "@/lib/workforce";

export const runtime = "nodejs";

function parseDueDate(dateString?: string): Date | null {
  if (!dateString) {
    return null;
  }

  return new Date(`${dateString}T12:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const parsedQuery = todoQuerySchema.safeParse({
    userId: url.searchParams.get("userId") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const where: Prisma.TodoWhereInput = {};

  if (auth.user.role === "EMPLOYEE") {
    where.assignedToId = auth.user.id;
  } else if (parsedQuery.data.userId) {
    where.assignedToId = parsedQuery.data.userId;
  }

  if (parsedQuery.data.date) {
    const start = toDateOnly(parsedQuery.data.date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    where.dueDate = { gte: start, lt: end };
  }

  if (parsedQuery.data.status) {
    where.status = parsedQuery.data.status;
  }

  const todos = await prisma.todo.findMany({
    where,
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
          avatarUrl: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "TODO_LIST_VIEW",
    meta: {
      count: todos.length,
      scope: auth.user.role === "EMPLOYEE" ? "self" : "team",
    },
  });

  return NextResponse.json({ todos }, { status: 200 });
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

  const todo = await prisma.todo.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assignedToId,
      assignedById: auth.user.id,
      dueDate: parseDueDate(parsed.data.dueDate),
      status: parsed.data.status ?? "TODO",
      priority: parsed.data.priority ?? "MEDIUM",
      origin:
        parsed.data.origin ??
        (assignedToId === auth.user.id ? "PERSONAL" : "ASSIGNED"),
      completionAt:
        parsed.data.status === "DONE" ? new Date() : null,
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
          avatarUrl: true,
        },
      },
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "TODO_CREATED",
    meta: {
      todoId: todo.id,
      assignedToId,
      status: todo.status,
      priority: todo.priority,
      origin: todo.origin,
    },
  });

  return NextResponse.json({ todo }, { status: 201 });
}
