-- Which storefront(s) a product is listed on (nadeck.net and/or ar.nadeck.net). Existing
-- products default to 'main' only - nothing becomes visible on ar.nadeck.net until an admin
-- opts it in.
CREATE TYPE "Market" AS ENUM ('main', 'ar');

ALTER TABLE "Product" ADD COLUMN "markets" "Market"[] NOT NULL DEFAULT ARRAY['main']::"Market"[];
