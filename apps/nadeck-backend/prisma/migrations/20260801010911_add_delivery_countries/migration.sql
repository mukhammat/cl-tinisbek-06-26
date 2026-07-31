-- CreateTable
CREATE TABLE "DeliveryCountry" (
    "code" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "priceKzt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceSar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "markets" "Market"[] DEFAULT ARRAY['main']::"Market"[],

    CONSTRAINT "DeliveryCountry_pkey" PRIMARY KEY ("code")
);
