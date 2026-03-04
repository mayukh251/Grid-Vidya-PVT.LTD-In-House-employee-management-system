"use client";

import type { Role } from "@prisma/client";
import { LoaderCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
  origin: "ASSIGNED" | "PERSONAL" | "CALENDAR";
};

type EodReport = {
  id: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  blockers: string | null;
  nextPlan: string | null;
  managerComment: string | null;
  managerRating: number;
  tasks: Array<{ id: string; title: string; status: string }>;
};

type DayDetail = {
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

export function TaskCenter({ role }: { role: Role }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [eods, setEods] = useState<EodReport[]>([]);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDescription, setTodoDescription] = useState("");
  const [todoStatus, setTodoStatus] = useState<Todo["status"]>("TODO");
  const [todoPriority, setTodoPriority] = useState<Todo["priority"]>("MEDIUM");
  const [blockers, setBlockers] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [submittingTodo, setSubmittingTodo] = useState(false);
  const [submittingEod, setSubmittingEod] = useState(false);
  const [workingClock, setWorkingClock] = useState<"SIGNIN" | "SIGNOUT" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadData() {
    const [todoResponse, eodResponse, dayResponse] = await Promise.all([
      fetch("/api/todos", { cache: "no-store" }),
      fetch("/api/eod", { cache: "no-store" }),
      fetch(`/api/calendar/day?date=${today}`, { cache: "no-store" }),
    ]);

    if (todoResponse.ok) {
      const payload = (await todoResponse.json()) as { todos: Todo[] };
      setTodos(payload.todos);
    }

    if (eodResponse.ok) {
      const payload = (await eodResponse.json()) as { eods: EodReport[] };
      setEods(payload.eods);
    }

    if (dayResponse.ok) {
      const payload = (await dayResponse.json()) as DayDetail;
      setDayDetail(payload);
    }
  }

  useEffect(() => {
    loadData().catch(() => {
      setMessage("Unable to load workspace data");
    });
  }, []);

  async function submitTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTodo(true);
    setMessage(null);

    const response = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: todoTitle,
        description: todoDescription,
        status: todoStatus,
        priority: todoPriority,
        dueDate: today,
      }),
    });

    if (response.ok) {
      setTodoTitle("");
      setTodoDescription("");
      setTodoStatus("TODO");
      setTodoPriority("MEDIUM");
      setMessage("Task created");
      await loadData();
    } else {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setMessage(payload?.message ?? "Failed to create task");
    }

    setSubmittingTodo(false);
  }

  async function submitEod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingEod(true);
    setMessage(null);

    const response = await fetch("/api/eod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        blockers,
        nextPlan,
      }),
    });

    if (response.ok) {
      setBlockers("");
      setNextPlan("");
      setMessage("EOD submitted");
      await loadData();
    } else {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setMessage(payload?.message ?? "Failed to submit EOD");
    }

    setSubmittingEod(false);
  }

  async function markClock(type: "SIGNIN" | "SIGNOUT") {
    setWorkingClock(type);
    setMessage(null);

    const response = await fetch("/api/time/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });

    if (response.ok) {
      setMessage(type === "SIGNIN" ? "Signed in successfully" : "Signed out successfully");
      await loadData();
    } else {
      setMessage("Unable to update attendance");
    }

    setWorkingClock(null);
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 lg:col-span-8">
        <section className="card-shell bg-gradient-to-br from-[#242f43] to-[#1a2334]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-2xl uppercase">Assigned & Personal Tasks</h2>
            <span className="chip">{role}</span>
          </div>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
                No tasks available.
              </p>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white">{todo.title}</p>
                    <p className="text-xs text-white/55">
                      {todo.priority} • {todo.origin}
                    </p>
                    {todo.description ? (
                      <p className="text-xs text-white/45">{todo.description}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      todo.status === "IN_PROGRESS"
                        ? "bg-amber-300/25 text-amber-100"
                        : todo.status === "TODO"
                          ? "bg-fuchsia-300/25 text-fuchsia-200"
                          : "bg-emerald-300/25 text-emerald-200"
                    }`}
                  >
                    {todo.status.replace("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>

          <form className="mt-4 grid gap-3" onSubmit={submitTodo}>
            <input
              value={todoTitle}
              onChange={(event) => setTodoTitle(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
              placeholder="New task title"
              required
            />
            <input
              value={todoDescription}
              onChange={(event) => setTodoDescription(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
              placeholder="Task description"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={todoStatus}
                onChange={(event) => setTodoStatus(event.target.value as Todo["status"])}
                className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              <select
                value={todoPriority}
                onChange={(event) => setTodoPriority(event.target.value as Todo["priority"])}
                className="h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>

              <button
                type="submit"
                disabled={submittingTodo}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#f06757] via-[#ef6c5f] to-[#6574ff] px-5 text-sm text-white disabled:opacity-70"
              >
                {submittingTodo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Add Task
              </button>
            </div>
          </form>
        </section>

        <section className="card-shell bg-gradient-to-br from-[#20262f] to-[#171d27]">
          <h2 className="font-[var(--font-display)] text-2xl uppercase">EOD Submission</h2>
          <p className="mt-1 text-sm text-white/60">
            Tasks for today are linked automatically when submitting EOD.
          </p>
          <form className="mt-4 space-y-3" onSubmit={submitEod}>
            <textarea
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
              className="h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
              placeholder="Blockers"
            />
            <textarea
              value={nextPlan}
              onChange={(event) => setNextPlan(event.target.value)}
              className="h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
              placeholder="Plan for next day"
            />
            <button
              type="submit"
              disabled={submittingEod}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#f06757] via-[#ef6c5f] to-[#6574ff] px-5 text-sm text-white disabled:opacity-70"
            >
              {submittingEod ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Submit EOD
            </button>
          </form>
        </section>
      </div>

      <div className="col-span-12 space-y-5 lg:col-span-4">
        <section className="card-shell bg-gradient-to-br from-[#202734] to-[#172030]">
          <h2 className="font-[var(--font-display)] text-2xl uppercase">Attendance</h2>
          <p className="mt-2 text-sm text-white/65">Sign in and sign out actions auto-calculate hours and overtime.</p>
          <div className="mt-4 grid gap-2">
            <button
              onClick={() => markClock("SIGNIN")}
              disabled={workingClock !== null}
              className="h-10 rounded-full bg-emerald-400/80 text-sm font-medium text-emerald-950 disabled:opacity-70"
            >
              {workingClock === "SIGNIN" ? "Processing..." : "Sign In"}
            </button>
            <button
              onClick={() => markClock("SIGNOUT")}
              disabled={workingClock !== null}
              className="h-10 rounded-full bg-rose-400/80 text-sm font-medium text-rose-950 disabled:opacity-70"
            >
              {workingClock === "SIGNOUT" ? "Processing..." : "Sign Out"}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
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
          <div className="mt-3 space-y-2">
            {dayDetail?.attendance.timeline.length ? (
              dayDetail.attendance.timeline.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/70">
                  <span>{item.type}</span>
                  <span>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
                Timeline appears after sign in/sign out.
              </p>
            )}
          </div>
        </section>

        <section className="card-shell">
          <h2 className="font-[var(--font-display)] text-2xl uppercase">Previous EODs</h2>
          <div className="mt-3 space-y-2">
            {eods.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
                No EOD records yet.
              </p>
            ) : (
              eods.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-white/55">{entry.date.slice(0, 10)}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        entry.status === "APPROVED"
                          ? "bg-emerald-300/25 text-emerald-200"
                          : entry.status === "REJECTED"
                            ? "bg-rose-300/25 text-rose-200"
                            : "bg-fuchsia-300/25 text-fuchsia-200"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/80">
                    {entry.tasks.length} linked tasks • Rating {entry.managerRating.toFixed(1)}
                  </p>
                  {entry.managerComment ? (
                    <p className="mt-1 text-xs text-cyan-200/85">{entry.managerComment}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        {message ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/75">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
