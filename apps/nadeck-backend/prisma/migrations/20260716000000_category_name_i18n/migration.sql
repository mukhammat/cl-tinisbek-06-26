-- Category.name moves from a plain string to a JSON string of { ru, en, ar },
-- matching how Medicine.name/description/etc are already stored.
-- Existing plain names are wrapped so every language falls back to the original value.
UPDATE "Category"
SET "name" = json_build_object('ru', "name", 'en', "name", 'ar', "name")::text
WHERE "name" IS NOT NULL AND left("name", 1) != '{';
