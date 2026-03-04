import bcrypt from "bcryptjs";
import {
  EodStatus,
  PrismaClient,
  Role,
  TimeEntryType,
  TodoOrigin,
  TodoPriority,
  TodoStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const motivationByWeekday: Array<{ weekday: number; text: string }> = [
  {
    weekday: 1,
    text: "Start strong — set one bold goal today.\nSmall wins stack into big momentum.",
  },
  {
    weekday: 2,
    text: "Keep the focus — finish what you started.\nClear one blocker, unlock progress.",
  },
  {
    weekday: 3,
    text: "Midweek is leverage — protect deep work windows.\nConsistency beats intensity.",
  },
  {
    weekday: 4,
    text: "Push with precision — close high-impact tasks first.\nProgress loves clarity.",
  },
  {
    weekday: 5,
    text: "Finish the week with intent.\nWrap loose ends and document learnings.",
  },
  {
    weekday: 6,
    text: "Refine and reset.\nSmall improvements compound into operational excellence.",
  },
  {
    weekday: 7,
    text: "Reflect, recharge, and plan.\nA focused week starts with a clear mind.",
  },
];

function dayAt(hour: number, minute = 0, dayOffset = 0): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

function dateOnly(dayOffset = 0): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.eodComment.deleteMany();
  await prisma.eodReport.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.todo.deleteMany();
  await prisma.motivation.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Pass@123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Ava Admin",
      email: "admin@gridvidya.local",
      passwordHash,
      role: Role.ADMIN,
      avatarUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Mark Manager",
      email: "manager@gridvidya.local",
      passwordHash,
      role: Role.MANAGER,
      managerId: admin.id,
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",
    },
  });

  const employee = await prisma.user.create({
    data: {
      name: "Emma Employee",
      email: "employee@gridvidya.local",
      passwordHash,
      role: Role.EMPLOYEE,
      managerId: manager.id,
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
    },
  });

  const analyst = await prisma.user.create({
    data: {
      name: "Neil Analyst",
      email: "analyst@gridvidya.local",
      passwordHash,
      role: Role.EMPLOYEE,
      managerId: manager.id,
      avatarUrl:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop",
    },
  });

  const tasks = await Promise.all([
    prisma.todo.create({
      data: {
        title: "Publish staffing utilization report",
        description: "Finalize labor variance and publish by 4 PM.",
        assignedToId: employee.id,
        assignedById: manager.id,
        dueDate: dayAt(17, 0, 0),
        status: TodoStatus.IN_PROGRESS,
        priority: TodoPriority.HIGH,
        origin: TodoOrigin.ASSIGNED,
      },
    }),
    prisma.todo.create({
      data: {
        title: "Resolve delayed kitchen checklist",
        description: "Coordinate with ops and mark closure in tracker.",
        assignedToId: employee.id,
        assignedById: manager.id,
        dueDate: dayAt(18, 0, 0),
        status: TodoStatus.DONE,
        priority: TodoPriority.MEDIUM,
        origin: TodoOrigin.CALENDAR,
        completionAt: dayAt(14, 30, 0),
      },
    }),
    prisma.todo.create({
      data: {
        title: "Review vendor invoice anomalies",
        description: "Cross-check receipts and escalate mismatches.",
        assignedToId: analyst.id,
        assignedById: manager.id,
        dueDate: dayAt(16, 0, 1),
        status: TodoStatus.TODO,
        priority: TodoPriority.HIGH,
        origin: TodoOrigin.ASSIGNED,
      },
    }),
    prisma.todo.create({
      data: {
        title: "Prepare Monday KPI briefing",
        description: "Draft trend notes for manager standup.",
        assignedToId: employee.id,
        assignedById: employee.id,
        dueDate: dayAt(11, 0, 1),
        status: TodoStatus.TODO,
        priority: TodoPriority.LOW,
        origin: TodoOrigin.PERSONAL,
      },
    }),
    prisma.todo.create({
      data: {
        title: "Validate table-turn benchmark sample",
        description: "Complete accuracy verification for past week.",
        assignedToId: analyst.id,
        assignedById: manager.id,
        dueDate: dayAt(15, 0, -1),
        status: TodoStatus.DONE,
        priority: TodoPriority.MEDIUM,
        origin: TodoOrigin.CALENDAR,
        completionAt: dayAt(15, 20, -1),
      },
    }),
  ]);

  await prisma.timeEntry.createMany({
    data: [
      { userId: employee.id, type: TimeEntryType.SIGNIN, timestamp: dayAt(9, 18, 0) },
      { userId: employee.id, type: TimeEntryType.SIGNOUT, timestamp: dayAt(18, 12, 0) },
      { userId: analyst.id, type: TimeEntryType.SIGNIN, timestamp: dayAt(8, 55, 0) },
      { userId: manager.id, type: TimeEntryType.SIGNIN, timestamp: dayAt(9, 5, 0) },
      { userId: manager.id, type: TimeEntryType.SIGNOUT, timestamp: dayAt(19, 0, -1) },
      { userId: employee.id, type: TimeEntryType.SIGNIN, timestamp: dayAt(9, 5, -1) },
      { userId: employee.id, type: TimeEntryType.SIGNOUT, timestamp: dayAt(17, 42, -1) },
    ],
  });

  const yesterdayTaskSnapshot = tasks
    .filter((task) => task.assignedToId === employee.id)
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
    }));

  const yesterdayEod = await prisma.eodReport.create({
    data: {
      userId: employee.id,
      date: dateOnly(-1),
      tasks: yesterdayTaskSnapshot,
      blockers: "Waiting on delayed POS export from kitchen node.",
      nextPlan: "Close staffing optimization deck and publish summary.",
      status: EodStatus.APPROVED,
      approvedById: manager.id,
      approvedAt: dayAt(20, 5, -1),
      managerComment: "Great progress, include floor-level variance next time.",
      managerRating: 4.6,
    },
  });

  await prisma.eodComment.create({
    data: {
      eodReportId: yesterdayEod.id,
      authorId: manager.id,
      comment: "Approved. Please attach zone-level completion stats tomorrow.",
    },
  });

  await prisma.motivation.createMany({
    data: motivationByWeekday.map((entry) => ({
      weekday: entry.weekday,
      text: entry.text,
      active: true,
      updatedById: manager.id,
    })),
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "SEED_BOOTSTRAP",
        meta: { message: "Workforce baseline seeded" },
      },
      {
        userId: manager.id,
        action: "SEED_EOD_APPROVED",
        meta: { eodReportId: yesterdayEod.id, status: "APPROVED" },
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
