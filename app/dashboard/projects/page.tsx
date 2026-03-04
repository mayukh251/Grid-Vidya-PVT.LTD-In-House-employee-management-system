import { redirect } from "next/navigation";
import { EodReviewBoard } from "@/components/projects/eod-review-board";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-[var(--font-display)] text-3xl uppercase tracking-wide text-white">
          Manager Control Panel
        </h1>
        <p className="mt-1 text-sm text-white/60">
          EOD approval workflow, leaderboard monitoring, and motivational banner controls.
        </p>
      </div>

      <EodReviewBoard role={session.role} />
    </section>
  );
}


