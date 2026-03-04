import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { calendarDayQuerySchema } from "@/lib/validation";
import { getDayBounds, summarizeAttendance, toDateOnly } from "@/lib/workforce";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const parsed = calendarDayQuerySchema.safeParse({
    date: url.searchParams.get("date"),
    userId: url.searchParams.get("userId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let targetUserId = auth.user.id;
  if (parsed.data.userId && requireRole(auth.user.role, "MANAGER")) {
    targetUserId = parsed.data.userId;
  }

  const day = toDateOnly(parsed.data.date);
  const { start, end } = getDayBounds(day);

  const [tasks, report, timeEntries] = await Promise.all([
    prisma.todo.findMany({
      where: {
        assignedToId: targetUserId,
        dueDate: {
          gte: start,
          lt: end,
        },
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
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.eodReport.findUnique({
      where: {
        userId_date: {
          userId: targetUserId,
          date: day,
        },
      },
      include: {
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
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: targetUserId,
        timestamp: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    }),
  ]);

  const attendance = summarizeAttendance(timeEntries);

  await writeAuditLog({
    userId: auth.user.id,
    action: "CALENDAR_DAY_VIEW",
    meta: {
      targetUserId,
      date: parsed.data.date,
      taskCount: tasks.length,
    },
  });

  return NextResponse.json(
    {
      date: parsed.data.date,
      tasks,
      eod: report,
      attendance,
    },
    { status: 200 },
  );
}
