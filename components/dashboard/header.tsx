"use client";

import { Bell, LogOut, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useManagerMode } from "@/components/dashboard/manager-mode";
import { cn } from "@/lib/utils";

type HeaderUser = {
  name: string;
  email: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
};

export function DashboardHeader({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const [managerMode, setManagerMode] = useManagerMode();
  const canToggleManagerMode = user.role === "MANAGER" || user.role === "ADMIN";

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--bg-main)]/90 px-6 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none ring-indigo-400/50 placeholder:text-white/40 focus:ring"
            placeholder="Search employees, tasks, insights"
          />
        </div>

        <button className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#ef6c5f] via-[#7c62ff] to-[#47b8ff] px-5 text-sm font-medium text-white shadow-[0_8px_28px_rgba(120,110,255,0.34)] transition hover:scale-[1.01]">
          <Plus className="h-4 w-4" />
          New Task
        </button>

        <button className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:text-white">
          <Bell className="h-4 w-4" />
        </button>

        {canToggleManagerMode ? (
          <button
            onClick={() => setManagerMode(!managerMode)}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border px-3 text-xs uppercase tracking-[0.14em] transition",
              managerMode
                ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
                : "border-white/15 bg-white/[0.04] text-white/65 hover:text-white",
            )}
            aria-pressed={managerMode}
            title="Toggle manager mode"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full transition",
                managerMode ? "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" : "bg-white/35",
              )}
            />
            Manager Mode
          </button>
        ) : null}

        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 text-xs font-semibold text-black">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="hidden pr-1 sm:block">
            <p className="text-sm text-white">{user.name}</p>
            <p className="text-xs text-white/55">{user.role}</p>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white/65 transition hover:text-white"
            onClick={onLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
