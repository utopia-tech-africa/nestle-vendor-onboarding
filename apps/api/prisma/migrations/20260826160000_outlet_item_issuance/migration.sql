-- CreateTable
CREATE TABLE "CatalogDistributionItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogDistributionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletItemIssuance" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedByUserId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OutletItemIssuance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogDistributionItem_name_key" ON "CatalogDistributionItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OutletItemIssuance_outletId_itemId_key" ON "OutletItemIssuance"("outletId", "itemId");

-- CreateIndex
CREATE INDEX "OutletItemIssuance_outletId_idx" ON "OutletItemIssuance"("outletId");

-- CreateIndex
CREATE INDEX "OutletItemIssuance_itemId_idx" ON "OutletItemIssuance"("itemId");

-- CreateIndex
CREATE INDEX "OutletItemIssuance_issuedByUserId_idx" ON "OutletItemIssuance"("issuedByUserId");

-- AddForeignKey
ALTER TABLE "OutletItemIssuance" ADD CONSTRAINT "OutletItemIssuance_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletItemIssuance" ADD CONSTRAINT "OutletItemIssuance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogDistributionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletItemIssuance" ADD CONSTRAINT "OutletItemIssuance_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CatalogDistributionItem" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cseeddi00000000000000001', 'Umbrella', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseeddi00000000000000002', 'Table', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseeddi00000000000000003', 'Poster pack', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
