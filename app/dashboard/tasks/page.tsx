import { redirect } from "next/navigation";
import { TaskCenter } from "@/components/tasks/task-center";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-[var(--font-display)] text-3xl uppercase tracking-wide text-white">
          Task, Attendance & EOD Workspace
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Daily execution board for task updates, attendance timeline, and EOD submission.
        </p>
      </div>

      <TaskCenter role={session.role} />
    </section>
  );
}


