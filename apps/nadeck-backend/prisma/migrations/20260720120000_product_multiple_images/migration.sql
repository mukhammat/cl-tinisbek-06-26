-- Products can now have multiple photos. Adds "images" (JSONB array of URLs), backfills it
-- from the existing single "image" column (images[0] = the old cover photo), then drops it.
ALTER TABLE "Product" ADD COLUMN "images" JSONB NOT NULL DEFAULT '[]';

UPDATE "Product" SET "images" = jsonb_build_array("image") WHERE "image" IS NOT NULL AND "image" != '';

ALTER TABLE "Product" DROP COLUMN "image";
