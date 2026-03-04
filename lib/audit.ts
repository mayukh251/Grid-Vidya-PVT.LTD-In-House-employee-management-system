import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditLogPayload = {
  userId?: string | null;
  action: string;
  meta?: Prisma.InputJsonValue;
};

export async function writeAuditLog(payload: AuditLogPayload): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: payload.userId ?? null,
        action: payload.action,
        meta: payload.meta,
      },
    });
  } catch (error) {
    console.error("Audit logging failed", error);
  }
}
