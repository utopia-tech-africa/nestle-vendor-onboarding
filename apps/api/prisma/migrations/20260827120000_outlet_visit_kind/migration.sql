-- CreateEnum
CREATE TYPE "OutletVisitKind" AS ENUM ('onboarding', 'items');

-- AlterTable
ALTER TABLE "OutletVisit" ADD COLUMN "kind" "OutletVisitKind" NOT NULL DEFAULT 'onboarding';

-- AlterTable
ALTER TABLE "OutletItemIssuance" ADD COLUMN "visitId" TEXT;

-- CreateIndex
CREATE INDEX "OutletVisit_kind_idx" ON "OutletVisit"("kind");

-- CreateIndex
CREATE INDEX "OutletItemIssuance_visitId_idx" ON "OutletItemIssuance"("visitId");

-- AddForeignKey
ALTER TABLE "OutletItemIssuance" ADD CONSTRAINT "OutletItemIssuance_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "OutletVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
