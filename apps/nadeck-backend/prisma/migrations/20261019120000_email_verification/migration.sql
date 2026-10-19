-- Email confirmation by a 6-digit code mailed after registration. Existing accounts start
-- unconfirmed, like new ones - nobody has confirmed an address yet.
--
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifyAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifyCode" TEXT,
ADD COLUMN     "verifyCodeExpiresAt" TEXT,
ADD COLUMN     "verifyCodeSentAt" TEXT;
