-- Multi-day rest days: User.restDay (single string) -> User.restDays (string array).
-- Safe by construction (unlike the prior make_user_rest_day_required incident):
-- the new column has a default and is backfilled from the existing NOT NULL
-- column before it's dropped, so it's never NULL/missing for any row.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "restDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill from the existing single-value column
UPDATE "User" SET "restDays" = ARRAY["restDay"];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "restDay";
