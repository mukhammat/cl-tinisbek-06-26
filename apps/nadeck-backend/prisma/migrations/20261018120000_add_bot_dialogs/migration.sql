-- Private chats between customers and the Telegram bot, shown in the admin panel's "Dialogs"
-- tab so a manager can read them and answer in the bot's place.
--
-- CreateTable
CREATE TABLE "BotDialog" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "pausedUntil" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotDialog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotDialogMessage" (
    "id" TEXT NOT NULL,
    "dialogId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotDialogMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotDialog_telegramId_key" ON "BotDialog"("telegramId");

-- CreateIndex
CREATE INDEX "BotDialog_lastMessageAt_idx" ON "BotDialog"("lastMessageAt");

-- CreateIndex
CREATE INDEX "BotDialogMessage_dialogId_createdAt_idx" ON "BotDialogMessage"("dialogId", "createdAt");

-- AddForeignKey
ALTER TABLE "BotDialogMessage" ADD CONSTRAINT "BotDialogMessage_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "BotDialog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
