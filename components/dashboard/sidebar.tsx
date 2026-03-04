"use client";

import type { Role } from "@prisma/client";
import {
  Briefcase,
  CircleHelp,
  FileText,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Receipt,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: Briefcase },
  { label: "My Task", href: "/dashboard/tasks", icon: ListChecks },
  { label: "Chats", href: "#", icon: MessageSquare },
  { label: "Documents", href: "#", icon: FileText },
  { label: "Receipts", href: "#", icon: Receipt },
  { label: "Settings", href: "#", icon: Settings },
  { label: "Help & Support", href: "#", icon: CircleHelp },
];

export function DashboardSidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-[280px] border-r border-white/10 bg-[var(--bg-sidebar)]/95 px-5 py-6 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-indigo-400 to-rose-400 text-lg font-bold text-black">
            Gv
          </div>
          <div>
            <p className="font-[var(--font-display)] text-xl uppercase tracking-wide text-white">
              Grid Vidya
            </p>
            <p className="text-xs uppercase tracking-[0.15em] text-white/50">{role}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href !== "#" &&
              (pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href)));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-gradient-to-r from-indigo-500/80 to-blue-500/80 text-white"
                    : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Projects</p>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Event Planning
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Breakfast Plan
            </div>
          </div>
        </div>

        <div className="mt-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/55">
          Structured workspace with high-contrast analytics for operations teams.
        </div>
      </div>
    </aside>
  );
}


