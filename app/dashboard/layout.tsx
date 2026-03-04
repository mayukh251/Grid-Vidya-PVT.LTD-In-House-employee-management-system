import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-transparent">
      <DashboardSidebar role={session.role} />

      <div className="ml-[280px] min-h-screen">
        <DashboardHeader
          user={{
            name: session.name,
            email: session.email,
            role: session.role,
          }}
        />

        <main className="p-6 pt-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}


