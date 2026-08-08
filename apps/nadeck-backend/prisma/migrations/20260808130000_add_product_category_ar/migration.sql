-- Per-storefront product categories: "categoryId" stays nadeck.net's, "categoryIdAr" is
-- ar.nadeck.net's. The two markets keep entirely separate Category rows (Category.markets),
-- so one shared id was always an orphan on whichever storefront it didn't belong to.
--
-- Nullable rather than backfilled: an unset Arabic category falls back to "categoryId" at read
-- time, so existing products keep behaving exactly as they do today until someone files them
-- under an Arabic category - same fallback shape as images/imagesAr.
ALTER TABLE "Product" ADD COLUMN     "categoryIdAr" TEXT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryIdAr_fkey" FOREIGN KEY ("categoryIdAr") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
