/*
  Warnings:

  - You are about to drop the column `createdAt` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entity` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `eodId` on the `EodComment` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeId` on the `Todo` table. All the data in the column will be lost.
  - You are about to drop the column `creatorId` on the `Todo` table. All the data in the column will be lost.
  - You are about to drop the `Eod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TimeLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `eodReportId` to the `EodComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignedById` to the `Todo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignedToId` to the `Todo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('SIGNIN', 'SIGNOUT');

-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TodoOrigin" AS ENUM ('ASSIGNED', 'PERSONAL', 'CALENDAR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TodoStatus" ADD VALUE 'TODO';
ALTER TYPE "TodoStatus" ADD VALUE 'DONE';

-- DropForeignKey
ALTER TABLE "public"."Eod" DROP CONSTRAINT "Eod_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Eod" DROP CONSTRAINT "Eod_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EodComment" DROP CONSTRAINT "EodComment_eodId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TimeLog" DROP CONSTRAINT "TimeLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Todo" DROP CONSTRAINT "Todo_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Todo" DROP CONSTRAINT "Todo_creatorId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "createdAt",
DROP COLUMN "details",
DROP COLUMN "entity",
DROP COLUMN "entityId",
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "EodComment" DROP COLUMN "eodId",
ADD COLUMN     "eodReportId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Todo" DROP COLUMN "assigneeId",
DROP COLUMN "creatorId",
ADD COLUMN     "assignedById" TEXT NOT NULL,
ADD COLUMN     "assignedToId" TEXT NOT NULL,
ADD COLUMN     "completionAt" TIMESTAMP(3),
ADD COLUMN     "origin" "TodoOrigin" NOT NULL DEFAULT 'ASSIGNED',
ADD COLUMN     "priority" "TodoPriority" NOT NULL DEFAULT 'MEDIUM',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT;

-- DropTable
DROP TABLE "public"."Eod";

-- DropTable
DROP TABLE "public"."TimeLog";

-- DropEnum
DROP TYPE "public"."TimeAction";

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TimeEntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EodReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tasks" JSONB NOT NULL,
    "blockers" TEXT,
    "nextPlan" TEXT,
    "status" "EodStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "managerComment" TEXT,
    "managerRating" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EodReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motivation" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntry_userId_timestamp_idx" ON "TimeEntry"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "EodReport_date_status_idx" ON "EodReport"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EodReport_userId_date_key" ON "EodReport"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Motivation_weekday_key" ON "Motivation"("weekday");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "Todo_assignedToId_dueDate_idx" ON "Todo"("assignedToId", "dueDate");

-- CreateIndex
CREATE INDEX "Todo_status_idx" ON "Todo"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EodReport" ADD CONSTRAINT "EodReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EodReport" ADD CONSTRAINT "EodReport_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EodComment" ADD CONSTRAINT "EodComment_eodReportId_fkey" FOREIGN KEY ("eodReportId") REFERENCES "EodReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motivation" ADD CONSTRAINT "Motivation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
