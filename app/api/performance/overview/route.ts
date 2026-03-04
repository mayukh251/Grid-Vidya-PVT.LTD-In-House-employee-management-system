import type { EodReport, TimeEntry, Todo } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { performanceOverviewQuerySchema } from "@/lib/validation";
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

type DailyScore = {
  date: string;
  score: number;
  hoursWorked: number;
  taskCompletion: number;
  managerRating: number;
};

function getLatestEntryByUser(entries: TimeEntry[]): Map<string, TimeEntry> {
  const latest = new Map<string, TimeEntry>();
  for (const entry of entries) {
    const previous = latest.get(entry.userId);
    if (!previous || previous.timestamp < entry.timestamp) {
      latest.set(entry.userId, entry);
    }
  }
  return latest;
}

function computeDailyScore(
  userId: string,
  day: Date,
  allEntries: TimeEntry[],
  allTasks: Todo[],
  reports: EodReport[],
): DailyScore {
  const { start, end } = getDayBounds(day);
  const dayKey = formatDateKey(day);

  const entries = allEntries.filter(
    (entry) =>
      entry.userId === userId && entry.timestamp >= start && entry.timestamp < end,
  );
  const attendance = summarizeAttendance(entries);

  const tasks = allTasks.filter(
    (task) =>
      task.assignedToId === userId &&
      Boolean(task.dueDate) &&
      task.dueDate! >= start &&
      task.dueDate! < end,
  );
  const completion = calculateTaskCompletion(tasks);

  const report = reports.find(
    (item) => item.userId === userId && formatDateKey(item.date) === dayKey,
  );
  const managerRating = extractManagerRating(report ?? null);

  return {
    date: dayKey,
    score: calculatePerformanceScore({
      hoursWorked: attendance.hoursWorked,
      taskCompletionPercent: completion.percent,
      managerRating,
    }),
    hoursWorked: attendance.hoursWorked,
    taskCompletion: completion.percent,
    managerRating,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = performanceOverviewQuerySchema.safeParse({
    userId: new URL(request.url).searchParams.get("userId") ?? undefined,
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

  const today = toDateOnly();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);
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
      managerId: true,
    },
  });

  const workforceIds = workforce.map((user) => user.id);

  const [todayEntries, weekEntries, weekTasks, weekReports, todayTasks] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: { in: workforceIds },
        timestamp: { gte: today, lt: tomorrow },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: { in: workforceIds },
        timestamp: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.todo.findMany({
      where: {
        assignedToId: { in: workforceIds },
        dueDate: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.eodReport.findMany({
      where: {
        userId: { in: workforceIds },
        date: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.todo.findMany({
      where: {
        assignedToId: { in: workforceIds },
        dueDate: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  const latestEntries = getLatestEntryByUser(todayEntries);
  const employeesOnline = workforceIds.filter((userId) => {
    const latest = latestEntries.get(userId);
    return latest?.type === "SIGNIN";
  }).length;

  const hoursTodayByUser = workforceIds.map((userId) =>
    summarizeAttendance(todayEntries.filter((entry) => entry.userId === userId)).hoursWorked,
  );
  const averageWorkHoursToday =
    hoursTodayByUser.length > 0
      ? Number(
          (
            hoursTodayByUser.reduce((sum, hours) => sum + hours, 0) /
            hoursTodayByUser.length
          ).toFixed(2),
        )
      : 0;

  const tasksAssignedToday = todayTasks.length;
  const tasksCompletedToday = todayTasks.filter((task) => task.status === "DONE").length;

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    return day;
  });

  const userDailyScores = weekDays.map((day) =>
    computeDailyScore(targetUserId, day, weekEntries, weekTasks, weekReports),
  );

  const myDailyScore = userDailyScores[userDailyScores.length - 1]?.score ?? 0;
  const myWeeklyScore =
    userDailyScores.length > 0
      ? Number(
          (
            userDailyScores.reduce((sum, item) => sum + item.score, 0) /
            userDailyScores.length
          ).toFixed(2),
        )
      : 0;

  const leaderboard = workforce.map((user) => {
    const daily = weekDays.map((day) =>
      computeDailyScore(user.id, day, weekEntries, weekTasks, weekReports),
    );
    const weeklyScore =
      daily.length > 0
        ? daily.reduce((sum, item) => sum + item.score, 0) / daily.length
        : 0;
    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      weeklyScore: Number(weeklyScore.toFixed(2)),
      dailyScore: daily[daily.length - 1]?.score ?? 0,
    };
  });

  leaderboard.sort((a, b) => b.weeklyScore - a.weeklyScore);

  const companyWeeklyScore =
    leaderboard.length > 0
      ? Number(
          (
            leaderboard.reduce((sum, item) => sum + item.weeklyScore, 0) /
            leaderboard.length
          ).toFixed(2),
        )
      : 0;

  const overallEfficiencyScore = Number(
    ((tasksCompletedToday / Math.max(tasksAssignedToday, 1)) * 100).toFixed(2),
  );

  await writeAuditLog({
    userId: auth.user.id,
    action: "PERFORMANCE_OVERVIEW_VIEW",
    meta: {
      targetUserId,
      employeesOnline,
      overallEfficiencyScore,
    },
  });

  return NextResponse.json(
    {
      employeesOnline,
      averageWorkHoursToday,
      tasksCompletedToday,
      tasksAssignedToday,
      overallEfficiencyScore,
      myDailyScore,
      myWeeklyScore,
      companyWeeklyScore,
      dailyTrend: userDailyScores,
      leaderboard: leaderboard.slice(0, 5),
    },
    { status: 200 },
  );
}
