-- When the account was registered, for the admin panel's "Users" tab. Added without a default
-- first so existing accounts stay NULL ("unknown") instead of all getting today's date; only
-- rows created from now on get the timestamp.
--
-- AlterTable
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3);
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
