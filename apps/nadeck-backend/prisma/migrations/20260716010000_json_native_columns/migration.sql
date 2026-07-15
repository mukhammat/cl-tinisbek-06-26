-- Every one of these columns already stores valid JSON text (produced by
-- JSON.stringify in the application layer); switching to native jsonb lets
-- Postgres validate and query it instead of the app treating it as opaque text.

-- Category
ALTER TABLE "Category" ALTER COLUMN "name" TYPE JSONB USING "name"::jsonb;

-- Medicine
ALTER TABLE "Medicine" ALTER COLUMN "name" TYPE JSONB USING "name"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "activeSubstance" TYPE JSONB USING "activeSubstance"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "description" TYPE JSONB USING "description"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "fullDescription" TYPE JSONB USING "fullDescription"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "indications" TYPE JSONB USING "indications"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "contraindications" TYPE JSONB USING "contraindications"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "usage" TYPE JSONB USING "usage"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "volumes" DROP DEFAULT;
ALTER TABLE "Medicine" ALTER COLUMN "volumes" TYPE JSONB USING "volumes"::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "volumes" SET DEFAULT '[]'::jsonb;
ALTER TABLE "Medicine" ALTER COLUMN "dosageRules" TYPE JSONB USING "dosageRules"::jsonb;

-- Order
ALTER TABLE "Order" ALTER COLUMN "items" TYPE JSONB USING "items"::jsonb;
ALTER TABLE "Order" ALTER COLUMN "address" TYPE JSONB USING "address"::jsonb;

-- Notification
ALTER TABLE "Notification" ALTER COLUMN "message" TYPE JSONB USING "message"::jsonb;
