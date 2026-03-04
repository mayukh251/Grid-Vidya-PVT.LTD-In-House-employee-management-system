import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { leaderboardQuerySchema } from "@/lib/validation";
import {
  calculatePerformanceScore,
  calculateTaskCompletion,
  extractManagerRating,
  formatDateKey,
  getDayBounds,
  summarizeAttendance,
  toDateOnly,
} from "@/lib/workforce";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = leaderboardQuerySchema.safeParse({
    limit: new URL(request.url).searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const limit = parsed.data.limit ?? 5;
  const today = toDateOnly();
  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - 6);
  const weekEnd = new Date(today);
  weekEnd.setUTCDate(today.getUTCDate() + 1);

  const workforce = await prisma.user.findMany({
    where: { role: { in: ["EMPLOYEE", "MANAGER"] } },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
    },
  });

  const ids = workforce.map((user) => user.id);

  const [entries, tasks, reports] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: { in: ids },
        timestamp: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.todo.findMany({
      where: {
        assignedToId: { in: ids },
        dueDate: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.eodReport.findMany({
      where: {
        userId: { in: ids },
        date: { gte: weekStart, lt: weekEnd },
      },
    }),
  ]);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    return day;
  });

  const data = workforce
    .map((user) => {
      const dailyScores = weekDays.map((day) => {
        const dayKey = formatDateKey(day);
        const { start, end } = getDayBounds(day);

        const dayEntries = entries.filter(
          (entry) =>
            entry.userId === user.id &&
            entry.timestamp >= start &&
            entry.timestamp < end,
        );
        const dayTasks = tasks.filter(
          (task) =>
            task.assignedToId === user.id &&
            Boolean(task.dueDate) &&
            task.dueDate! >= start &&
            task.dueDate! < end,
        );
        const report = reports.find(
          (item) => item.userId === user.id && formatDateKey(item.date) === dayKey,
        );

        const hours = summarizeAttendance(dayEntries).hoursWorked;
        const completion = calculateTaskCompletion(dayTasks).percent;
        const managerRating = extractManagerRating(report ?? null);

        return calculatePerformanceScore({
          hoursWorked: hours,
          taskCompletionPercent: completion,
          managerRating,
        });
      });

      const weeklyScore =
        dailyScores.length > 0
          ? dailyScores.reduce((sum, item) => sum + item, 0) / dailyScores.length
          : 0;

      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        weeklyScore: Number(weeklyScore.toFixed(2)),
        dailyScore: Number((dailyScores[dailyScores.length - 1] ?? 0).toFixed(2)),
      };
    })
    .sort((a, b) => b.weeklyScore - a.weeklyScore)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  await writeAuditLog({
    userId: auth.user.id,
    action: "LEADERBOARD_VIEW",
    meta: { limit, returned: data.length },
  });

  return NextResponse.json({ leaderboard: data }, { status: 200 });
}
