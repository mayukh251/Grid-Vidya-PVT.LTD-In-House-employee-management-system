import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { motivationsQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const query = motivationsQuerySchema.safeParse({
    all: new URL(request.url).searchParams.get("all") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: query.error.flatten() },
      { status: 400 },
    );
  }

  const includeInactive = query.data.all === "1";
  const canViewAll = includeInactive && requireRole(auth.user.role, "MANAGER");

  const motivations = await prisma.motivation.findMany({
    where: canViewAll ? undefined : { active: true },
    orderBy: {
      weekday: "asc",
    },
  });

  await writeAuditLog({
    userId: auth.user.id,
    action: "MOTIVATION_LIST_VIEW",
    meta: {
      includeInactive: canViewAll,
      count: motivations.length,
    },
  });

  return NextResponse.json({ motivations }, { status: 200 });
}
