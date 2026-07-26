-- Scopes an admin account to a single storefront's products (see admin-emails.util.ts's
-- AR_ADMIN_EMAILS). Null keeps today's behavior: full access to every market.
ALTER TABLE "User" ADD COLUMN "adminMarket" "Market";
