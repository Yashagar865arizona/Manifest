-- AlterTable: add nurture sequence fields to waitlist_entries
ALTER TABLE "waitlist_entries"
  ADD COLUMN "sequenceStep"     INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN "nextEmailAt"      TIMESTAMP(3),
  ADD COLUMN "unsubscribeToken" TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN "unsubscribedAt"   TIMESTAMP(3);

-- Backfill unique unsubscribe tokens for existing rows
UPDATE "waitlist_entries" SET "unsubscribeToken" = gen_random_uuid()::text;

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_unsubscribeToken_key" ON "waitlist_entries"("unsubscribeToken");

-- CreateIndex: for cron query performance
CREATE INDEX "waitlist_entries_nextEmailAt_idx" ON "waitlist_entries"("nextEmailAt")
  WHERE "unsubscribedAt" IS NULL AND "nextEmailAt" IS NOT NULL;
