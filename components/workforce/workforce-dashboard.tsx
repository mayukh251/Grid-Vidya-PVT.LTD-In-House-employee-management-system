"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Role } from "@prisma/client";
import {
  AlarmClock,
  Bot,
  CheckCircle2,
  Circle,
  Flag,
  GripVertical,
  LoaderCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useManagerMode } from "@/components/dashboard/manager-mode";
import { cn } from "@/lib/utils";

type WeekDaySummary = {
  date: string;
  isToday: boolean;
  taskCount: number;
  completedCount: number;
  inProgressCount: number;
  eodStatus: "PENDING" | "APPROVED" | "REJECTED" | "MISSING";
  dotStatus: "green" | "yellow" | "red";
};

type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  origin: "ASSIGNED" | "PERSONAL" | "CALENDAR";
};

type DayDetail = {
  date: string;
  tasks: CalendarTask[];
  eod: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    managerComment: string | null;
  } | null;
  attendance: {
    hoursWorked: number;
    lateMinutes: number;
    overtimeHours: number;
    timeline: Array<{
      id: string;
      type: "SIGNIN" | "SIGNOUT";
      timestamp: string;
    }>;
  };
};

type Motivation = {
  id: string;
  weekday: number;
  text: string;
  active: boolean;
};

type PerformanceOverview = {
  employeesOnline: number;
  averageWorkHoursToday: number;
  tasksCompletedToday: number;
  tasksAssignedToday: number;
  overallEfficiencyScore: number;
  myDailyScore: number;
  myWeeklyScore: number;
  companyWeeklyScore: number;
  dailyTrend: Array<{
    date: string;
    score: number;
    hoursWorked: number;
    taskCompletion: number;
    managerRating: number;
  }>;
  leaderboard: Array<{
    userId: string;
    name: string;
    role: Role;
    avatarUrl: string | null;
    weeklyScore: number;
    dailyScore: number;
  }>;
};

type LeaderboardItem = {
  rank: number;
  userId: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  weeklyScore: number;
  dailyScore: number;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const emptyOverview: PerformanceOverview = {
  employeesOnline: 0,
  averageWorkHoursToday: 0,
  tasksCompletedToday: 0,
  tasksAssignedToday: 0,
  overallEfficiencyScore: 0,
  myDailyScore: 0,
  myWeeklyScore: 0,
  companyWeeklyScore: 0,
  dailyTrend: [],
  leaderboard: [],
};

function getWeekdayIndex(dateKey: string): number {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function parseDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return `${date.getUTCDate()}`;
}

function CountUp({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 650;
    const initial = displayValue;
    const delta = value - initial;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = initial + delta * progress;
      setDisplayValue(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function DroppableDay({
  day,
  selected,
  onSelect,
}: {
  day: WeekDaySummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: day.date });

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      title={`${day.taskCount} tasks, EOD: ${day.eodStatus}`}
      className={cn(
        "relative rounded-2xl border p-3 text-left transition",
        selected
          ? "border-cyan-300/60 bg-cyan-300/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
        isOver && "border-indigo-300/70 bg-indigo-300/10",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">{DAY_LABELS[getWeekdayIndex(day.date) - 1]}</span>
        <span className="text-sm font-medium text-white">{parseDateLabel(day.date)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            day.dotStatus === "green" && "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.75)]",
            day.dotStatus === "yellow" && "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.75)]",
            day.dotStatus === "red" && "bg-rose-300 shadow-[0_0_10px_rgba(253,164,175,0.75)]",
          )}
        />
        <span className="text-[11px] text-white/65">
          {day.completedCount}/{day.taskCount} done
        </span>
      </div>
      {day.isToday ? (
        <span className="absolute right-2 top-2 rounded-full bg-indigo-400/30 px-2 py-0.5 text-[10px] text-indigo-100">
          Today
        </span>
      ) : null}
    </button>
  );
}

function DraggableTask({ task }: { task: CalendarTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: "transform 150ms ease",
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left transition",
        isDragging && "opacity-40",
      )}
    >
      <GripVertical className="h-4 w-4 text-white/40 transition group-hover:text-white/70" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{task.title}</p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
          {task.priority} • {task.status.replace("_", " ")}
        </p>
      </div>
    </button>
  );
}

export function WorkforceDashboard({ role }: { role: Role }) {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [week, setWeek] = useState<WeekDaySummary[]>([]);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [overview, setOverview] = useState<PerformanceOverview>(emptyOverview);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [motivations, setMotivations] = useState<Motivation[]>([]);
  const [managerMode] = useManagerMode();
  const [loadingDay, setLoadingDay] = useState(false);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [savingMotivation, setSavingMotivation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [motivationDraft, setMotivationDraft] = useState("");

  const canManageMotivations =
    (role === "MANAGER" || role === "ADMIN") && managerMode;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadOverviewAndLeaders = useCallback(async () => {
    const [overviewResponse, leaderboardResponse] = await Promise.all([
      fetch("/api/performance/overview", { cache: "no-store" }),
      fetch("/api/leaderboard?limit=5", { cache: "no-store" }),
    ]);

    if (overviewResponse.ok) {
      const payload = (await overviewResponse.json()) as PerformanceOverview;
      setOverview(payload);
    }

    if (leaderboardResponse.ok) {
      const payload = (await leaderboardResponse.json()) as {
        leaderboard: LeaderboardItem[];
      };
      setLeaderboard(payload.leaderboard);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    const response = await fetch("/api/calendar/week", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load weekly calendar");
    }
    const payload = (await response.json()) as { days: WeekDaySummary[] };
    setWeek(payload.days);
  }, []);

  const loadDay = useCallback(async (dateKey: string) => {
    setLoadingDay(true);
    const response = await fetch(`/api/calendar/day?date=${dateKey}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load day detail");
    }
    const payload = (await response.json()) as DayDetail;
    setDayDetail(payload);
    setLoadingDay(false);
  }, []);

  const loadMotivations = useCallback(async () => {
    const response = await fetch(
      canManageMotivations ? "/api/motivations?all=1" : "/api/motivations",
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error("Unable to load motivations");
    }
    const payload = (await response.json()) as { motivations: Motivation[] };
    setMotivations(payload.motivations);
  }, [canManageMotivations]);

  useEffect(() => {
    Promise.all([loadOverviewAndLeaders(), loadWeek(), loadDay(selectedDate), loadMotivations()])
      .catch(() => setMessage("Unable to load workforce dashboard data"));
  }, []);

  useEffect(() => {
    loadDay(selectedDate).catch(() => setMessage("Unable to load day detail"));
  }, [selectedDate, loadDay]);

  useEffect(() => {
    loadMotivations().catch(() => setMessage("Unable to load motivations"));
  }, [loadMotivations]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadOverviewAndLeaders().catch(() => null);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadOverviewAndLeaders]);

  useEffect(() => {
    const weekday = getWeekdayIndex(selectedDate);
    const motivation =
      motivations.find((item) => item.weekday === weekday && item.active) ??
      motivations.find((item) => item.weekday === weekday);
    setMotivationDraft(motivation?.text ?? "");
  }, [selectedDate, motivations]);

  const selectedMotivation = useMemo(() => {
    const weekday = getWeekdayIndex(selectedDate);
    return (
      motivations.find((item) => item.weekday === weekday && item.active) ??
      motivations.find((item) => item.weekday === weekday) ??
      null
    );
  }, [motivations, selectedDate]);

  async function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const droppedDate = event.over?.id ? String(event.over.id) : null;

    if (!droppedDate || !week.some((day) => day.date === droppedDate)) {
      return;
    }

    setSavingTask(taskId);
    setMessage(null);

    const response = await fetch(`/api/calendar/task/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dueDate: droppedDate,
        origin: "CALENDAR",
      }),
    });

    if (!response.ok) {
      setMessage("Unable to reassign task to selected day");
      setSavingTask(null);
      return;
    }

    await Promise.all([
      loadWeek(),
      loadDay(selectedDate),
      loadOverviewAndLeaders(),
    ]);
    setSavingTask(null);
  }

  async function updateTaskStatus(taskId: string, status: CalendarTask["status"]) {
    setSavingTask(taskId);
    const response = await fetch(`/api/calendar/task/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setMessage("Unable to update task status");
      setSavingTask(null);
      return;
    }

    await Promise.all([
      loadDay(selectedDate),
      loadWeek(),
      loadOverviewAndLeaders(),
    ]);
    setSavingTask(null);
  }

  async function saveMotivation() {
    if (!selectedMotivation) {
      return;
    }
    setSavingMotivation(true);
    setMessage(null);

    const response = await fetch(`/api/motivations/${selectedMotivation.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: motivationDraft,
        weekday: selectedMotivation.weekday,
        active: true,
      }),
    });

    if (!response.ok) {
      setMessage("Unable to update motivational message");
      setSavingMotivation(false);
      return;
    }

    await loadMotivations();
    setMessage("Motivational banner updated");
    setSavingMotivation(false);
  }

  const completionPercent =
    overview.tasksAssignedToday > 0
      ? Math.round((overview.tasksCompletedToday / overview.tasksAssignedToday) * 100)
      : 0;
  const progressRadius = 44;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset =
    progressCircumference - (completionPercent / 100) * progressCircumference;

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
          {message}
        </p>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <section className="grid grid-cols-12 gap-5">
          <div className="col-span-12 space-y-5 xl:col-span-7">
            <article className="card-shell overflow-hidden">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-[var(--font-display)] text-3xl uppercase">Weekly Calendar</h2>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Monday to Sunday • drag tasks across days
                  </p>
                </div>
                {savingTask ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Saving task
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-7">
                {week.map((day) => (
                  <DroppableDay
                    key={day.date}
                    day={day}
                    selected={selectedDate === day.date}
                    onSelect={() => setSelectedDate(day.date)}
                  />
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                      Day Detail • {selectedDate}
                    </p>
                    <p className="text-xs text-white/55">
                      {dayDetail?.tasks.length ?? 0} tasks
                    </p>
                  </div>

                  {loadingDay ? (
                    <div className="flex h-32 items-center justify-center text-sm text-white/60">
                      Loading day details...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayDetail?.tasks.length ? (
                        dayDetail.tasks.map((task) => (
                          <div key={task.id} className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                            <DraggableTask task={task} />
                            <div className="flex gap-2 pl-8">
                              <button
                                onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}
                                className="rounded-full bg-indigo-300/25 px-2.5 py-0.5 text-[10px] text-indigo-100"
                              >
                                In Progress
                              </button>
                              <button
                                onClick={() => updateTaskStatus(task.id, "DONE")}
                                className="rounded-full bg-emerald-300/25 px-2.5 py-0.5 text-[10px] text-emerald-100"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/60">
                          No tasks on this date.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">Attendance Timeline</p>
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/70">
                    EOD Status: {dayDetail?.eod?.status ?? "MISSING"}
                  </div>
                  {dayDetail?.attendance.timeline.length ? (
                    dayDetail.attendance.timeline.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                        <span className="text-xs text-white/75">{item.type}</span>
                        <span className="text-xs text-white/55">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/60">
                      No attendance entries.
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                    <div className="rounded-xl bg-white/[0.04] p-2">
                      <p className="text-white/45">Hours</p>
                      <p className="text-white">{dayDetail?.attendance.hoursWorked ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] p-2">
                      <p className="text-white/45">Late</p>
                      <p className="text-white">{dayDetail?.attendance.lateMinutes ?? 0}m</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] p-2">
                      <p className="text-white/45">OT</p>
                      <p className="text-white">{dayDetail?.attendance.overtimeHours ?? 0}h</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="card-shell bg-gradient-to-r from-[#27304b] via-[#2b2c55] to-[#2d3b60]">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/60">Daily Motivation</p>
              {canManageMotivations && selectedMotivation ? (
                <div className="mt-2 space-y-3">
                  <textarea
                    value={motivationDraft}
                    onChange={(event) => setMotivationDraft(event.target.value)}
                    className="h-20 w-full rounded-xl border border-white/15 bg-black/25 p-3 text-sm text-white outline-none ring-cyan-300/40 focus:ring"
                  />
                  <button
                    onClick={saveMotivation}
                    disabled={savingMotivation}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-cyan-300/85 px-4 text-xs font-medium text-[#0c2034] disabled:opacity-70"
                  >
                    {savingMotivation ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Banner Text
                  </button>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/90">
                  {selectedMotivation?.text ??
                    "Keep momentum — one focused action can unlock the day."}
                </p>
              )}
            </article>
          </div>

          <article className="card-shell col-span-12 md:col-span-6 xl:col-span-3 bg-gradient-to-br from-[#1f2533] to-[#182031]">
            <h3 className="font-[var(--font-display)] text-2xl uppercase">Company Overview</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs uppercase text-white/50">Employees Online</p>
                <CountUp value={overview.employeesOnline} className="text-2xl text-white" />
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs uppercase text-white/50">Avg Hours Today</p>
                <CountUp value={overview.averageWorkHoursToday} decimals={2} className="text-2xl text-white" />
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs uppercase text-white/50">Efficiency</p>
                <CountUp value={overview.overallEfficiencyScore} suffix="%" decimals={1} className="text-2xl text-white" />
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs uppercase text-white/50">Tasks Done / Assigned</p>
                <p className="text-2xl text-white">
                  {overview.tasksCompletedToday}/{overview.tasksAssignedToday}
                </p>
              </div>
            </div>
          </article>

          <article className="card-shell col-span-12 md:col-span-6 xl:col-span-2 bg-gradient-to-br from-[#1f2230] to-[#191b27]">
            <h3 className="font-[var(--font-display)] text-2xl uppercase">Leaderboard</h3>
            <div className="mt-4 space-y-2">
              {leaderboard.map((item) => (
                <div key={item.userId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-300/25 text-xs text-indigo-100">
                    {item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white">{item.name}</p>
                    <p className="text-[10px] text-white/50">{item.role}</p>
                  </div>
                  <span className="text-xs text-cyan-100">{item.weeklyScore}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </DndContext>

      <section className="grid grid-cols-12 gap-5">
        <article className="card-shell col-span-12 lg:col-span-4 bg-gradient-to-br from-[#273250] to-[#1d2640]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-[var(--font-display)] text-2xl uppercase">Productivity Score</h3>
            <Sparkles className="h-4 w-4 text-cyan-200" />
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.dailyTrend}>
                <XAxis dataKey="date" tick={{ fill: "#9fb2d4", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "#151b2b",
                  }}
                />
                <Line dataKey="score" stroke="#7dd3fc" strokeWidth={3} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-white/50">Daily</p>
              <CountUp value={overview.myDailyScore} decimals={2} className="text-xl text-white" />
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-white/50">Weekly</p>
              <CountUp value={overview.myWeeklyScore} decimals={2} className="text-xl text-white" />
            </div>
          </div>
        </article>

        <article className="card-shell col-span-12 lg:col-span-4 bg-gradient-to-br from-[#2f2443] to-[#241a37]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-[var(--font-display)] text-2xl uppercase">Task Completion</h3>
            <CheckCircle2 className="h-4 w-4 text-emerald-200" />
          </div>
          <div className="relative flex items-center justify-center">
            <svg width="150" height="150" className="-rotate-90">
              <circle
                cx="75"
                cy="75"
                r={progressRadius}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="14"
                fill="transparent"
              />
              <circle
                cx="75"
                cy="75"
                r={progressRadius}
                stroke="#5eead4"
                strokeWidth="14"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressOffset}
                style={{ transition: "stroke-dashoffset 600ms ease" }}
              />
            </svg>
            <div className="absolute text-center">
              <CountUp value={completionPercent} suffix="%" className="text-3xl text-white" />
              <p className="text-xs text-white/50">Completion</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-white/50">Completed</p>
              <p className="text-xl text-white">{overview.tasksCompletedToday}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-white/50">Assigned</p>
              <p className="text-xl text-white">{overview.tasksAssignedToday}</p>
            </div>
          </div>
        </article>

        <article className="card-shell col-span-12 lg:col-span-4 bg-gradient-to-br from-[#2e263f] to-[#1f1930]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-[var(--font-display)] text-2xl uppercase">Attendance Summary</h3>
            <AlarmClock className="h-4 w-4 text-amber-200" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
              <span className="text-white/65">Hours Worked</span>
              <span className="text-white">{dayDetail?.attendance.hoursWorked ?? 0}h</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
              <span className="text-white/65">Late Login</span>
              <span className="text-white">{dayDetail?.attendance.lateMinutes ?? 0} min</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
              <span className="text-white/65">Overtime</span>
              <span className="text-white">{dayDetail?.attendance.overtimeHours ?? 0}h</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
              <span className="text-white/65">Company Weekly Score</span>
              <CountUp value={overview.companyWeeklyScore} decimals={2} className="text-white" />
            </div>
          </div>
        </article>
      </section>

      <article className="card-shell bg-gradient-to-br from-[#1e2230] to-[#171b27]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-3xl uppercase">AI Workforce Assistant</h3>
          <Bot className="h-5 w-5 text-cyan-200" />
        </div>
        <div className="space-y-3">
          <div className="max-w-3xl rounded-2xl bg-white/[0.05] p-3 text-sm text-white/85">
            Team momentum is stable. Two opportunities detected: close pending EODs and
            move high-priority tasks away from overloaded Thursday.
          </div>
          <div className="ml-auto max-w-2xl rounded-2xl bg-cyan-300/85 p-3 text-sm text-[#153146]">
            Recommend top action for today.
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full bg-cyan-300/85 px-4 py-1.5 text-xs text-[#153146]">
              Show at-risk employees
            </button>
            <button className="rounded-full bg-indigo-300/35 px-4 py-1.5 text-xs text-indigo-100">
              Rebalance workload
            </button>
            <button className="rounded-full bg-rose-300/25 px-4 py-1.5 text-xs text-rose-100">
              Flag missing EODs
            </button>
          </div>
          <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/45">
            Ask AI assistant for workforce insights...
          </div>
        </div>
      </article>
    </div>
  );
}
