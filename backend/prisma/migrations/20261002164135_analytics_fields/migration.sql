-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- Backfill: orders paid before this column existed. updatedAt is the closest
-- record of when they were paid (refunds may have moved it later).
UPDATE "Order" SET "paidAt" = "updatedAt"
WHERE "paymentStatus" IN ('PAID', 'REFUNDED') AND "paidAt" IS NULL;
