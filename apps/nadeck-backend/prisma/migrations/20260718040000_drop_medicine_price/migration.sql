-- AlterTable
-- Price is now tied to a specific mg strength (see the `volumes` JSON column), not the
-- medicine as a whole, so these top-level columns are dropped.
ALTER TABLE "Medicine" DROP COLUMN "price";
ALTER TABLE "Medicine" DROP COLUMN "priceUsd";
