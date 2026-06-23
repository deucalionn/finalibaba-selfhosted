-- Add Woob generic bank scraper credentials to Institution
-- Allows configuring any Woob-supported bank directly from the Settings UI

ALTER TABLE "Institution" ADD COLUMN "woobModule" TEXT;
ALTER TABLE "Institution" ADD COLUMN "woobLogin" TEXT;
ALTER TABLE "Institution" ADD COLUMN "woobPassword" TEXT;
