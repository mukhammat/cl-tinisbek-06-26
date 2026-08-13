-- Site traffic analytics. Every screen a visitor opens is one row here, written by the
-- browser (POST /api/analytics/track) and read back only by the admin dashboard.
--
-- Anonymous by design: "visitorId" is a random id the browser keeps in its own localStorage
-- and "sessionId" one that lapses after 30 idle minutes - there is no IP address, no email
-- and no cross-site cookie in this table. "country" is the one Cloudflare already puts on
-- the request.
--
-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "market" "Market" NOT NULL DEFAULT 'main',
    "path" TEXT NOT NULL,
    "productId" TEXT,
    "referrer" TEXT NOT NULL DEFAULT '',
    "lang" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "country" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- The dashboard only ever asks for "a date range, optionally on one storefront".
-- CreateIndex
CREATE INDEX "VisitEvent_createdAt_idx" ON "VisitEvent"("createdAt");

-- CreateIndex
CREATE INDEX "VisitEvent_market_createdAt_idx" ON "VisitEvent"("market", "createdAt");

-- Lets the dashboard show an order beside the visits of the storefront it was placed on.
-- Existing orders default to 'main' - they predate ar.nadeck.net's own checkout traffic.
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "market" "Market" NOT NULL DEFAULT 'main';
