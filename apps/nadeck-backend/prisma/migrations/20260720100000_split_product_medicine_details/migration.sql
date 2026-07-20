-- Splits the monolithic "Medicine" table into a generic "Product" base table plus a
-- "MedicineDetails" table holding the peptide-only clinical/dosing fields, and adds an
-- (initially empty) "AdditionalGoodDetails" table for non-peptide items (syringes,
-- vitamins, protein, accessories, ...). Existing rows are preserved and become type
-- 'peptide' with their clinical fields carried over into MedicineDetails.

-- 1. Discriminator enum
CREATE TYPE "ProductType" AS ENUM ('peptide', 'additional_good');

-- 2. Rename the base table (id/name/categoryId/description/fullDescription/image/rating/inStock stay)
ALTER TABLE "Medicine" RENAME TO "Product";
ALTER TABLE "Product" ADD COLUMN "type" "ProductType" NOT NULL DEFAULT 'peptide';

-- 3. MedicineDetails carries the peptide-only columns, keyed 1:1 on the product id
CREATE TABLE "MedicineDetails" (
    "productId"         TEXT NOT NULL,
    "indications"       JSONB NOT NULL,
    "contraindications" JSONB NOT NULL,
    "usage"             JSONB NOT NULL,
    "form"              TEXT NOT NULL,
    "mgPerUnit"         DOUBLE PRECISION NOT NULL,
    "dosageRules"       JSONB NOT NULL,
    "volumes"           JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "MedicineDetails_pkey" PRIMARY KEY ("productId")
);

INSERT INTO "MedicineDetails" ("productId", "indications", "contraindications", "usage", "form", "mgPerUnit", "dosageRules", "volumes")
SELECT "id", "indications", "contraindications", "usage", "form", "mgPerUnit", "dosageRules", "volumes" FROM "Product";

ALTER TABLE "MedicineDetails" ADD CONSTRAINT "MedicineDetails_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" DROP COLUMN "indications";
ALTER TABLE "Product" DROP COLUMN "contraindications";
ALTER TABLE "Product" DROP COLUMN "usage";
ALTER TABLE "Product" DROP COLUMN "form";
ALTER TABLE "Product" DROP COLUMN "mgPerUnit";
ALTER TABLE "Product" DROP COLUMN "dosageRules";
ALTER TABLE "Product" DROP COLUMN "volumes";

-- 4. AdditionalGoodDetails: empty for now, populated as accessory-type products are added
CREATE TABLE "AdditionalGoodDetails" (
    "productId" TEXT NOT NULL,
    "volumes"   JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "AdditionalGoodDetails_pkey" PRIMARY KEY ("productId")
);

ALTER TABLE "AdditionalGoodDetails" ADD CONSTRAINT "AdditionalGoodDetails_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
