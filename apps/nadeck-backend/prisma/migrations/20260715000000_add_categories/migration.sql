-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Seed existing medicine categories into the new table
INSERT INTO "Category" ("id", "name", "sortOrder", "isActive")
SELECT DISTINCT "category", INITCAP(REPLACE("category", '_', ' ')), 0, true
FROM "Medicine"
ON CONFLICT ("id") DO NOTHING;

-- Add foreign key column
ALTER TABLE "Medicine" ADD COLUMN "categoryId" TEXT;

UPDATE "Medicine"
SET "categoryId" = "category";

ALTER TABLE "Medicine" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Medicine"
ADD CONSTRAINT "Medicine_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Medicine" DROP COLUMN "category";