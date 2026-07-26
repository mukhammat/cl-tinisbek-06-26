-- SAR grand total, captured at checkout time same as totalPriceUsd (not recomputed later).
-- Existing orders default to 0 - they predate SAR pricing.
ALTER TABLE "Order" ADD COLUMN "totalPriceSar" DOUBLE PRECISION NOT NULL DEFAULT 0;
