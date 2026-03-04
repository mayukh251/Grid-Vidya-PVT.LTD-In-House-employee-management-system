import type { EodReport, TimeEntry, Todo } from "@prisma/client";

export const EXPECTED_HOURS_PER_DAY = 8;
export const STANDARD_SIGNIN_HOUR = 9;

export function toDateOnly(dateString?: string): Date {
  const date = dateString ? new Date(`${dateString}T00:00:00.000Z`) : new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function getWeekDays(startInput?: string): Date[] {
  const base = startInput ? toDateOnly(startInput) : toDateOnly();
  const day = base.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() + offsetToMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date;
  });
}

type AttendanceSummary = {
  hoursWorked: number;
  lateMinutes: number;
  overtimeHours: number;
  timeline: Array<{
    id: string;
    type: "SIGNIN" | "SIGNOUT";
    timestamp: string;
  }>;
};

export function summarizeAttendance(entries: TimeEntry[], now = new Date()): AttendanceSummary {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  let hoursMs = 0;
  let lateMinutes = 0;
  let firstSignIn: Date | null = null;
  let openSignIn: Date | null = null;

  for (const entry of sorted) {
    if (entry.type === "SIGNIN") {
      if (!firstSignIn) {
        firstSignIn = entry.timestamp;
      }
      openSignIn = entry.timestamp;
      continue;
    }

    if (entry.type === "SIGNOUT" && openSignIn) {
      hoursMs += Math.max(0, entry.timestamp.getTime() - openSignIn.getTime());
      openSignIn = null;
    }
  }

  if (openSignIn) {
    hoursMs += Math.max(0, now.getTime() - openSignIn.getTime());
  }

  if (firstSignIn) {
    const lateBoundary = new Date(firstSignIn);
    lateBoundary.setHours(STANDARD_SIGNIN_HOUR, 0, 0, 0);
    lateMinutes = Math.max(
      0,
      Math.round((firstSignIn.getTime() - lateBoundary.getTime()) / 60000),
    );
  }

  const hoursWorked = Number((hoursMs / 3600000).toFixed(2));
  const overtimeHours = Number(
    Math.max(0, hoursWorked - EXPECTED_HOURS_PER_DAY).toFixed(2),
  );

  return {
    hoursWorked,
    lateMinutes,
    overtimeHours,
    timeline: sorted.map((entry) => ({
      id: entry.id,
      type: entry.type,
      timestamp: entry.timestamp.toISOString(),
    })),
  };
}

export function calculateTaskCompletion(tasks: Todo[]): {
  total: number;
  completed: number;
  percent: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "DONE").length;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    percent: Number(percent.toFixed(2)),
  };
}

export function calculatePerformanceScore(input: {
  hoursWorked: number;
  taskCompletionPercent: number;
  managerRating: number;
}): number {
  const hoursComponent =
    Math.min(input.hoursWorked / EXPECTED_HOURS_PER_DAY, 1) * 40;
  const taskComponent = (Math.min(input.taskCompletionPercent, 100) / 100) * 40;
  const ratingComponent = (Math.min(Math.max(input.managerRating, 0), 5) / 5) * 20;

  return Number((hoursComponent + taskComponent + ratingComponent).toFixed(2));
}

export function extractManagerRating(report: EodReport | null): number {
  if (!report) {
    return 3;
  }
  return report.managerRating;
}
