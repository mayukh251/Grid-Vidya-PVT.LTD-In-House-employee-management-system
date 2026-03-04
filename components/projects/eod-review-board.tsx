"use client";

import type { Role } from "@prisma/client";
import { LoaderCircle, Star, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type EodReportItem = {
  id: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  blockers: string | null;
  nextPlan: string | null;
  managerComment: string | null;
  managerRating: number;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
  }>;
  user: {
    id: string;
    name: string;
    role: Role;
    avatarUrl: string | null;
  };
  comments: Array<{
    id: string;
    comment: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      role: Role;
    };
  }>;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  weeklyScore: number;
  dailyScore: number;
};

type Motivation = {
  id: string;
  weekday: number;
  text: string;
  active: boolean;
};

const canReviewRoles: Role[] = ["MANAGER", "ADMIN"];

export function EodReviewBoard({ role }: { role: Role }) {
  const [eods, setEods] = useState<EodReportItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [motivations, setMotivations] = useState<Motivation[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingMotivationId, setSavingMotivationId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canReview = useMemo(() => canReviewRoles.includes(role), [role]);

  async function loadData() {
    const [eodResponse, leaderboardResponse, motivationResponse] = await Promise.all([
      fetch("/api/eod", { cache: "no-store" }),
      fetch("/api/leaderboard?limit=5", { cache: "no-store" }),
      fetch("/api/motivations?all=1", { cache: "no-store" }),
    ]);

    if (eodResponse.ok) {
      const payload = (await eodResponse.json()) as { eods: EodReportItem[] };
      setEods(payload.eods);
      setRatings(
        Object.fromEntries(
          payload.eods.map((item) => [item.id, Number(item.managerRating.toFixed(1))]),
        ),
      );
    }

    if (leaderboardResponse.ok) {
      const payload = (await leaderboardResponse.json()) as {
        leaderboard: LeaderboardEntry[];
      };
      setLeaderboard(payload.leaderboard);
    }

    if (motivationResponse.ok) {
      const payload = (await motivationResponse.json()) as {
        motivations: Motivation[];
      };
      setMotivations(payload.motivations);
    }
  }

  useEffect(() => {
    loadData().catch(() => {
      setMessage("Unable to load manager panel data");
    });
  }, []);

  async function reviewEod(id: string, status: "APPROVED" | "REJECTED") {
    setBusyId(id);
    setMessage(null);

    const response = await fetch(`/api/eod/${encodeURIComponent(id)}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        managerComment: comments[id] ?? "",
        managerRating: ratings[id] ?? 3,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setMessage(payload?.message ?? "Unable to update EOD status");
      setBusyId(null);
      return;
    }

    setComments((prev) => ({ ...prev, [id]: "" }));
    setMessage(`EOD ${status.toLowerCase()} successfully`);
    await loadData();
    setBusyId(null);
  }

  async function saveMotivation(motivation: Motivation) {
    setSavingMotivationId(motivation.id);
    setMessage(null);
    const response = await fetch(`/api/motivations/${motivation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekday: motivation.weekday,
        text: motivation.text,
        active: motivation.active,
      }),
    });

    if (!response.ok) {
      setMessage("Unable to update motivation");
      setSavingMotivationId(null);
      return;
    }

    setMessage("Motivation updated");
    await loadData();
    setSavingMotivationId(null);
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-12 gap-5">
        <section className="card-shell col-span-12 overflow-hidden p-0 xl:col-span-8">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-[var(--font-display)] text-2xl uppercase text-white">
              Manager EOD Control Panel
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {canReview
                ? "Approve or reject submissions, add comments, and assign ratings."
                : "View your EOD submission history and feedback."}
            </p>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto p-4">
            {eods.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/65">
                No EOD submissions available.
              </p>
            ) : (
              eods.map((eod) => (
                <article
                  key={eod.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#232a37] to-[#1a202a] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-white">{eod.user.name}</p>
                      <p className="text-xs text-white/55">
                        {eod.user.role} • {eod.date.slice(0, 10)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        eod.status === "APPROVED"
                          ? "bg-emerald-300/25 text-emerald-200"
                          : eod.status === "REJECTED"
                            ? "bg-rose-300/25 text-rose-200"
                            : "bg-fuchsia-300/25 text-fuchsia-200"
                      }`}
                    >
                      {eod.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/50">
                      Linked Tasks ({eod.tasks.length})
                    </p>
                    <div className="mt-2 space-y-1">
                      {eod.tasks.length > 0 ? (
                        eod.tasks.map((task) => (
                          <p key={task.id} className="text-sm text-white/78">
                            {task.title} • {task.status}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-white/55">No tasks attached.</p>
                      )}
                    </div>
                  </div>

                  {eod.blockers ? (
                    <p className="mt-2 text-xs text-rose-200/90">Blockers: {eod.blockers}</p>
                  ) : null}
                  {eod.nextPlan ? (
                    <p className="mt-1 text-xs text-cyan-200/90">Next plan: {eod.nextPlan}</p>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/50">
                      Reviewer Comments
                    </p>
                    <div className="mt-2 space-y-2">
                      {eod.comments.length > 0 ? (
                        eod.comments.map((comment) => (
                          <div key={comment.id}>
                            <p className="text-xs text-white/55">
                              {comment.author.name} ({comment.author.role})
                            </p>
                            <p className="text-sm text-white/78">{comment.comment}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-white/55">No comments yet.</p>
                      )}
                    </div>
                  </div>

                  {canReview ? (
                    <div className="mt-3 space-y-2">
                      <input
                        value={comments[eod.id] ?? ""}
                        onChange={(event) =>
                          setComments((prev) => ({
                            ...prev,
                            [eod.id]: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none ring-indigo-400/40 placeholder:text-white/35 focus:ring"
                        placeholder="Add manager comment"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/55">Rating</span>
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={0.1}
                          value={ratings[eod.id] ?? 3}
                          onChange={(event) =>
                            setRatings((prev) => ({
                              ...prev,
                              [eod.id]: Number(event.target.value),
                            }))
                          }
                          className="w-40"
                        />
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2.5 py-1 text-xs text-amber-100">
                          <Star className="h-3 w-3 fill-current" />
                          {(ratings[eod.id] ?? 3).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewEod(eod.id, "APPROVED")}
                          disabled={busyId === eod.id}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-400/85 px-4 text-sm font-medium text-emerald-950 disabled:opacity-70"
                        >
                          {busyId === eod.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                          Approve
                        </button>
                        <button
                          onClick={() => reviewEod(eod.id, "REJECTED")}
                          disabled={busyId === eod.id}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-rose-400/85 px-4 text-sm font-medium text-rose-950 disabled:opacity-70"
                        >
                          {busyId === eod.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="col-span-12 space-y-5 xl:col-span-4">
          <section className="card-shell bg-gradient-to-br from-[#202839] to-[#191e2d]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-[var(--font-display)] text-2xl uppercase">Top Performers</h3>
              <Trophy className="h-4 w-4 text-amber-200" />
            </div>
            <div className="space-y-2">
              {leaderboard.map((item) => (
                <div key={item.userId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <div>
                    <p className="text-white">{item.rank}. {item.name}</p>
                    <p className="text-xs text-white/50">{item.role}</p>
                  </div>
                  <span className="rounded-full bg-cyan-300/20 px-2 py-1 text-xs text-cyan-100">
                    {item.weeklyScore}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {canReview ? (
            <section className="card-shell bg-gradient-to-br from-[#28223d] to-[#1d1a2f]">
              <h3 className="font-[var(--font-display)] text-2xl uppercase">Motivational Banner Control</h3>
              <div className="mt-3 space-y-3">
                {motivations.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-white/55">
                      Weekday {item.weekday}
                    </p>
                    <textarea
                      value={item.text}
                      onChange={(event) =>
                        setMotivations((prev) =>
                          prev.map((entry) =>
                            entry.id === item.id ? { ...entry, text: event.target.value } : entry,
                          ),
                        )
                      }
                      className="mt-2 h-20 w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => saveMotivation(item)}
                      disabled={savingMotivationId === item.id}
                      className="mt-2 inline-flex h-8 items-center gap-2 rounded-full bg-cyan-300/85 px-4 text-xs font-medium text-[#0c2034] disabled:opacity-70"
                    >
                      {savingMotivationId === item.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
