import type { Role } from "@prisma/client";

export const AUTH_COOKIE_NAME = "gv_token";

const roleRank: Record<Role, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function hasMinimumRole(currentRole: Role, requiredRole: Role): boolean {
  return roleRank[currentRole] >= roleRank[requiredRole];
}


