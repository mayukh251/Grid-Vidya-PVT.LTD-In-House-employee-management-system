import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionFromCookies();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111722]/80 shadow-[0_40px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[1.15fr_1fr]">
        <section className="relative hidden p-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(103,133,255,0.28),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(248,112,91,0.25),transparent_45%)]" />
          <div className="relative space-y-6">
            <span className="chip">Grid Vidya</span>
            <h1 className="font-[var(--font-display)] text-5xl leading-[0.95] uppercase text-white">
              Intelligent Workforce OS
            </h1>
            <p className="max-w-sm text-sm leading-6 text-white/70">
              Grid Vidya unifies attendance, task execution, EOD governance, and performance intelligence.
            </p>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <p className="font-medium text-white/85">Seeded Access</p>
              <p>employee@gridvidya.local / Pass@123</p>
              <p>manager@gridvidya.local / Pass@123</p>
              <p>admin@gridvidya.local / Pass@123</p>
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}


