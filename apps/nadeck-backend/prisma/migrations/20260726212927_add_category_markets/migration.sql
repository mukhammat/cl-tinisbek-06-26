-- Which storefront(s) a category is listed on (nadeck.net and/or ar.nadeck.net), same
-- semantics as Product.markets. Existing categories default to 'main' only.
ALTER TABLE "Category" ADD COLUMN "markets" "Market"[] NOT NULL DEFAULT ARRAY['main']::"Market"[];
