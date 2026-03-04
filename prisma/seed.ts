import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Pass@123";

async function seedDemoUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gridvidya.local" },
    update: {
      name: "Ava Admin",
      role: Role.ADMIN,
      passwordHash,
      managerId: null,
    },
    create: {
      name: "Ava Admin",
      email: "admin@gridvidya.local",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@gridvidya.local" },
    update: {
      name: "Mark Manager",
      role: Role.MANAGER,
      passwordHash,
      managerId: admin.id,
    },
    create: {
      name: "Mark Manager",
      email: "manager@gridvidya.local",
      passwordHash,
      role: Role.MANAGER,
      managerId: admin.id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@gridvidya.local" },
    update: {
      name: "Emma Employee",
      role: Role.EMPLOYEE,
      passwordHash,
      managerId: manager.id,
    },
    create: {
      name: "Emma Employee",
      email: "employee@gridvidya.local",
      passwordHash,
      role: Role.EMPLOYEE,
      managerId: manager.id,
    },
  });

  return [admin, manager, employee];
}

async function main() {
  const users = await seedDemoUsers();

  console.log("Demo users ensured:");
  for (const user of users) {
    console.log(`- ${user.email} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
