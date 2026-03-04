import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cuidSchema = z.string().cuid();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const clockSchema = z
  .object({
    type: z.enum(["SIGNIN", "SIGNOUT"]).optional(),
    action: z.enum(["CLOCK_IN", "CLOCK_OUT"]).optional(),
    timestamp: z.string().datetime().optional(),
  })
  .refine((value) => Boolean(value.type || value.action), {
    message: "type or action is required",
    path: ["type"],
  })
  .transform((value) => ({
    type:
      value.type ??
      (value.action === "CLOCK_IN"
        ? "SIGNIN"
        : "SIGNOUT"),
    timestamp: value.timestamp,
  }));

export const eodCreateSchema = z.object({
  userId: cuidSchema.optional(),
  date: dateSchema.optional(),
  blockers: z.string().trim().max(3000).optional(),
  nextPlan: z.string().trim().max(3000).optional(),
});

export const eodApproveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  managerComment: z.string().trim().max(2000).optional(),
  managerRating: z.number().min(0).max(5).optional(),
});

export const eodQuerySchema = z.object({
  userId: cuidSchema.optional(),
  date: dateSchema.optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const todoCreateSchema = z.object({
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(2000).optional(),
  assignedToId: cuidSchema.optional(),
  dueDate: dateSchema.optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  origin: z.enum(["ASSIGNED", "PERSONAL", "CALENDAR"]).optional(),
});

export const todoPatchSchema = z.object({
  title: z.string().trim().min(3).max(240).optional(),
  description: z.string().trim().max(2000).optional(),
  assignedToId: cuidSchema.optional(),
  dueDate: dateSchema.optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  origin: z.enum(["ASSIGNED", "PERSONAL", "CALENDAR"]).optional(),
});

export const todoQuerySchema = z.object({
  userId: cuidSchema.optional(),
  date: dateSchema.optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
});

export const calendarWeekQuerySchema = z.object({
  userId: cuidSchema.optional(),
  start: dateSchema.optional(),
});

export const calendarDayQuerySchema = z.object({
  userId: cuidSchema.optional(),
  date: dateSchema,
});

export const performanceOverviewQuerySchema = z.object({
  userId: cuidSchema.optional(),
});

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const motivationsQuerySchema = z.object({
  all: z.enum(["0", "1"]).optional(),
});

export const motivationUpdateSchema = z.object({
  weekday: z.number().int().min(1).max(7).optional(),
  text: z.string().trim().min(8).max(400),
  active: z.boolean().optional(),
});
