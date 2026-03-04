import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { clockSchema } from "@/lib/validation";
import { summarizeAttendance, toDateOnly } from "@/lib/workforce";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = clockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const timestamp = parsed.data.timestamp
    ? new Date(parsed.data.timestamp)
    : new Date();

  const entry = await prisma.timeEntry.create({
    data: {
      userId: auth.user.id,
      type: parsed.data.type,
      timestamp,
    },
  });

  const today = toDateOnly();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  const todayEntries = await prisma.timeEntry.findMany({
    where: {
      userId: auth.user.id,
      timestamp: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const attendance = summarizeAttendance(todayEntries);

  await writeAuditLog({
    userId: auth.user.id,
    action: "TIME_CLOCK",
    meta: {
      type: parsed.data.type,
      timestamp: entry.timestamp.toISOString(),
      hoursWorked: attendance.hoursWorked,
      lateMinutes: attendance.lateMinutes,
      overtimeHours: attendance.overtimeHours,
    },
  });

  return NextResponse.json(
    {
      entry: {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp.toISOString(),
      },
      attendance,
    },
    { status: 201 },
  );
}
