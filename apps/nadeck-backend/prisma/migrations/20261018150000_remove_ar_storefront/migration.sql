-- ar.nadeck.net is shut down: nadeck.net is the only storefront, Arabic is no longer a site
-- language and SAR no longer a currency. This removes the Arabic storefront's own rows
-- (products, categories, orders, visits, its scoped admin) and every column that only existed
-- for it, and strips the Arabic translations / SAR prices out of the JSON that remains.

-- The one order checked out on ar.nadeck.net.
DELETE FROM "Order" WHERE "id" = 'PP-721234';

-- nadeck.net products that relied on the Arabic gallery keep those photos as their own.
UPDATE "Product" SET "images" = "imagesAr"
WHERE jsonb_array_length("images") = 0 AND jsonb_array_length("imagesAr") > 0;

-- Products listed only on ar.nadeck.net, with whatever pointed at them.
DELETE FROM "StockSubscription" WHERE "medicineId" IN (SELECT "id" FROM "Product" WHERE NOT ('main' = ANY("markets")));
DELETE FROM "Notification" WHERE "medicineId" IN (SELECT "id" FROM "Product" WHERE NOT ('main' = ANY("markets")));
DELETE FROM "Product" WHERE NOT ('main' = ANY("markets"));

-- A nadeck.net product was filed under the Arabic "Additional Goods" category; nadeck.net has
-- its own one.
UPDATE "Product" SET "categoryId" = 'additional'
WHERE "categoryId" = 'additional_goods' AND EXISTS (SELECT 1 FROM "Category" WHERE "id" = 'additional');

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryIdAr_fkey";
ALTER TABLE "Product" DROP COLUMN "categoryIdAr",
DROP COLUMN "imagesAr",
DROP COLUMN "markets";

-- Categories only ar.nadeck.net listed (kept if something still points at one, so the
-- migration can't fail on the foreign key).
DELETE FROM "Category"
WHERE NOT ('main' = ANY("markets")) AND "id" NOT IN (SELECT "categoryId" FROM "Product");
ALTER TABLE "Category" DROP COLUMN "markets";

DELETE FROM "DeliveryCountry" WHERE NOT ('main' = ANY("markets"));
ALTER TABLE "DeliveryCountry" DROP COLUMN "markets",
DROP COLUMN "priceSar";

DELETE FROM "VisitEvent" WHERE "market" = 'ar';
DROP INDEX IF EXISTS "VisitEvent_market_createdAt_idx";
ALTER TABLE "VisitEvent" DROP COLUMN "market";

ALTER TABLE "Order" DROP COLUMN "market",
DROP COLUMN "totalPriceSar",
DROP COLUMN "discountSar";

-- The ar.nadeck.net admin account.
DELETE FROM "User" WHERE "adminMarket" = 'ar';
ALTER TABLE "User" DROP COLUMN "adminMarket";

DROP TYPE "Market";

-- Arabic translations and SAR prices inside the JSON columns.
UPDATE "Product" SET
  "name" = CASE WHEN jsonb_typeof("name") = 'object' THEN "name" - 'ar' ELSE "name" END,
  "description" = CASE WHEN jsonb_typeof("description") = 'object' THEN "description" - 'ar' ELSE "description" END,
  "fullDescription" = CASE WHEN jsonb_typeof("fullDescription") = 'object' THEN "fullDescription" - 'ar' ELSE "fullDescription" END;

UPDATE "MedicineDetails" SET
  "indications" = CASE WHEN jsonb_typeof("indications") = 'object' THEN "indications" - 'ar' ELSE "indications" END,
  "contraindications" = CASE WHEN jsonb_typeof("contraindications") = 'object' THEN "contraindications" - 'ar' ELSE "contraindications" END,
  "usage" = CASE WHEN jsonb_typeof("usage") = 'object' THEN "usage" - 'ar' ELSE "usage" END,
  "volumes" = CASE
    WHEN jsonb_typeof("volumes") = 'array'
      THEN COALESCE((SELECT jsonb_agg(v - 'priceSar' ORDER BY n) FROM jsonb_array_elements("volumes") WITH ORDINALITY AS t(v, n)), '[]'::jsonb)
    ELSE "volumes"
  END;

UPDATE "AdditionalGoodDetails" SET
  "volumes" = COALESCE((SELECT jsonb_agg(v - 'priceSar' ORDER BY n) FROM jsonb_array_elements("volumes") WITH ORDINALITY AS t(v, n)), '[]'::jsonb)
WHERE jsonb_typeof("volumes") = 'array';

UPDATE "Category" SET "name" = "name" - 'ar' WHERE jsonb_typeof("name") = 'object';
UPDATE "DeliveryCountry" SET "name" = "name" - 'ar' WHERE jsonb_typeof("name") = 'object';
UPDATE "Notification" SET "message" = "message" - 'ar' WHERE jsonb_typeof("message") = 'object';

UPDATE "Order" SET "items" = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(i) <> 'object' THEN i
      WHEN jsonb_typeof(i -> 'medicineName') = 'object' THEN jsonb_set(i - 'priceSar', '{medicineName}', (i -> 'medicineName') - 'ar')
      ELSE i - 'priceSar'
    END
    ORDER BY n)
  FROM jsonb_array_elements("items") WITH ORDINALITY AS t(i, n)
)
WHERE jsonb_typeof("items") = 'array' AND jsonb_array_length("items") > 0;
