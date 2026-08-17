-- Link stock sales recorded during an outlet visit check-in.
ALTER TABLE "Sale" ADD COLUMN "outletVisitId" TEXT;

CREATE UNIQUE INDEX "Sale_outletVisitId_key" ON "Sale"("outletVisitId");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_outletVisitId_fkey" FOREIGN KEY ("outletVisitId") REFERENCES "OutletVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
