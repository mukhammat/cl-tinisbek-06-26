-- Per-storefront product galleries: "images" stays nadeck.net's, "imagesAr" is ar.nadeck.net's.
-- Existing products start with an empty Arabic gallery and keep showing their current photos
-- there, because an empty gallery falls back to the other market's at read time.
ALTER TABLE "Product" ADD COLUMN "imagesAr" JSONB NOT NULL DEFAULT '[]';
