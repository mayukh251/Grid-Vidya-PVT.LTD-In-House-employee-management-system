import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { calendarWeekQuerySchema } from "@/lib/validation";
import { formatDateKey, getDayBounds, getWeekDays, toDateOnly } from "@/lib/workforce";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const parsed = calendarWeekQuerySchema.safeParse({
    userId: url.searchParams.get("userId") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
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

  const weekDays = getWeekDays(parsed.data.start);
  const weekStart = toDateOnly(formatDateKey(weekDays[0]));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const [tasks, eodReports] = await Promise.all([
    prisma.todo.findMany({
      where: {
        assignedToId: targetUserId,
        dueDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    }),
    prisma.eodReport.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    }),
  ]);

  const todayKey = formatDateKey(new Date());

  const byDay = weekDays.map((day) => {
    const dayKey = formatDateKey(day);
    const { start, end } = getDayBounds(day);
    const dayTasks = tasks.filter(
      (task) => Boolean(task.dueDate) && task.dueDate! >= start && task.dueDate! < end,
    );
    const completed = dayTasks.filter((task) => task.status === "DONE").length;
    const inProgress = dayTasks.filter((task) => task.status === "IN_PROGRESS").length;
    const report = eodReports.find((item) => formatDateKey(item.date) === dayKey);

    let dotStatus: "green" | "yellow" | "red" = "yellow";
    if (!report) {
      dotStatus = "red";
    } else if (dayTasks.length === 0 || completed === dayTasks.length) {
      dotStatus = "green";
    }

    return {
      date: dayKey,
      isToday: dayKey === todayKey,
      taskCount: dayTasks.length,
      completedCount: completed,
      inProgressCount: inProgress,
      eodStatus: report?.status ?? "MISSING",
      dotStatus,
    };
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "CALENDAR_WEEK_VIEW",
    meta: {
      targetUserId,
      start: formatDateKey(weekStart),
    },
  });

  return NextResponse.json(
    {
      start: formatDateKey(weekStart),
      end: formatDateKey(weekDays[6]),
      days: byDay,
    },
    { status: 200 },
  );
}
