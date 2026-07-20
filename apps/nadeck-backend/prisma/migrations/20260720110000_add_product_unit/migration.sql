-- Measurement unit for a product's volumes/prices - independent of ProductType (a peptide can
-- be mg powder or ml liquid; an additional good can be pcs-counted or ml/mg dosed).
CREATE TYPE "ProductUnit" AS ENUM ('mg', 'ml', 'pcs');

ALTER TABLE "Product" ADD COLUMN "unit" "ProductUnit" NOT NULL DEFAULT 'mg';
