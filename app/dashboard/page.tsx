import { redirect } from "next/navigation";
import { WorkforceDashboard } from "@/components/workforce/workforce-dashboard";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-white/50">Grid Vidya / Intelligent Workforce Operating System</p>
        <span className="chip">Productivity • Transparency • Insights</span>
      </div>

      <WorkforceDashboard role={session.role} />
    </section>
  );
}
