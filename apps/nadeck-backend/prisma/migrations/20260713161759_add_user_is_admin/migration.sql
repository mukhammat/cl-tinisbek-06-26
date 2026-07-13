-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: promote any pre-existing accounts that already matched the admin email
-- pattern (see admin-emails.util.ts) so this migration doesn't lock out current admins.
UPDATE "User" SET "isAdmin" = true
WHERE lower(email) IN ('dosnet2200@gmail.com', 'admin@example.com');
