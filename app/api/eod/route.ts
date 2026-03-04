import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { eodCreateSchema, eodQuerySchema } from "@/lib/validation";
import { formatDateKey, getDayBounds, toDateOnly } from "@/lib/workforce";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const parsedQuery = eodQuerySchema.safeParse({
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

  const where: Prisma.EodReportWhereInput = {};

  if (auth.user.role === "EMPLOYEE") {
    where.userId = auth.user.id;
  } else if (parsedQuery.data.userId) {
    where.userId = parsedQuery.data.userId;
  }

  if (parsedQuery.data.date) {
    where.date = toDateOnly(parsedQuery.data.date);
  }

  if (parsedQuery.data.status) {
    where.status = parsedQuery.data.status;
  }

  const reports = await prisma.eodReport.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
          managerId: true,
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
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "EOD_LIST_VIEW",
    meta: {
      count: reports.length,
      scope: auth.user.role === "EMPLOYEE" ? "self" : "team",
    },
  });

  return NextResponse.json({ eods: reports }, { status: 200 });
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

  const parsed = eodCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userId = parsed.data.userId ?? auth.user.id;
  if (userId !== auth.user.id && !requireRole(auth.user.role, "MANAGER")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const date = toDateOnly(parsed.data.date);
  const { start, end } = getDayBounds(date);

  const tasks = await prisma.todo.findMany({
    where: {
      assignedToId: userId,
      dueDate: {
        gte: start,
        lt: end,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const taskSnapshot = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? formatDateKey(task.dueDate) : null,
  }));

  try {
    const report = await prisma.eodReport.create({
      data: {
        userId,
        date,
        tasks: taskSnapshot,
        blockers: parsed.data.blockers ?? null,
        nextPlan: parsed.data.nextPlan ?? null,
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
      },
    });

    await writeAuditLog({
      userId: auth.user.id,
      action: "EOD_CREATED",
      meta: {
        eodId: report.id,
        submittedFor: userId,
        taskCount: taskSnapshot.length,
      },
    });

    return NextResponse.json({ eod: report }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Only one EOD report is allowed per employee per date" },
        { status: 409 },
      );
    }
    throw error;
  }
}
