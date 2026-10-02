-- AlterEnum
BEGIN;
CREATE TYPE "Gateway_new" AS ENUM ('RAZORPAY');
ALTER TABLE "Payment" ALTER COLUMN "gateway" TYPE "Gateway_new" USING ("gateway"::text::"Gateway_new");
ALTER TABLE "WebhookEvent" ALTER COLUMN "gateway" TYPE "Gateway_new" USING ("gateway"::text::"Gateway_new");
ALTER TYPE "Gateway" RENAME TO "Gateway_old";
ALTER TYPE "Gateway_new" RENAME TO "Gateway";
DROP TYPE "public"."Gateway_old";
COMMIT;

