-- CreateTable
CREATE TABLE "PromoCode" (
    "code" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL DEFAULT '',
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "expiresAt" TEXT,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("code")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountKzt" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountSar" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Order_promoCode_idx" ON "Order"("promoCode");
