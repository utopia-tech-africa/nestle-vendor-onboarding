-- CreateTable
CREATE TABLE "CatalogNestleProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogNestleProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCompetitorBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCompetitorBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCompetitorProduct" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCompetitorProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogNestleProduct_name_key" ON "CatalogNestleProduct"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCompetitorBrand_name_key" ON "CatalogCompetitorBrand"("name");

-- CreateIndex
CREATE INDEX "CatalogCompetitorProduct_brandId_sortOrder_idx" ON "CatalogCompetitorProduct"("brandId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCompetitorProduct_brandId_name_key" ON "CatalogCompetitorProduct"("brandId", "name");

-- AddForeignKey
ALTER TABLE "CatalogCompetitorProduct" ADD CONSTRAINT "CatalogCompetitorProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "CatalogCompetitorBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed starter lists (Ops can add more without an app release).
INSERT INTO "CatalogNestleProduct" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cseednp00000000000000001', 'Milo', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000002', 'Cerelac', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000003', 'Nido', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000004', 'Maggi', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000005', 'Golden Morn', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000006', 'Nescafé', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000007', 'Lactogen', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseednp00000000000000008', 'Other', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "CatalogCompetitorBrand" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cseedcb00000000000000001', 'Ovaltine', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcb00000000000000002', 'Cowbell', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcb00000000000000003', 'Peak', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcb00000000000000004', 'Cadbury', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcb00000000000000005', 'Local koko', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcb00000000000000006', 'Other', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "CatalogCompetitorProduct" ("id", "brandId", "name", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cseedcp00000000000000001', 'cseedcb00000000000000001', 'Ovaltine powder', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000002', 'cseedcb00000000000000001', 'Ovaltine ready-to-drink', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000003', 'cseedcb00000000000000001', 'Other', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000004', 'cseedcb00000000000000002', 'Cowbell chocolate', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000005', 'cseedcb00000000000000002', 'Cowbell milk', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000006', 'cseedcb00000000000000002', 'Other', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000007', 'cseedcb00000000000000003', 'Peak milk', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000008', 'cseedcb00000000000000003', 'Peak chocolate', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000009', 'cseedcb00000000000000003', 'Other', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000010', 'cseedcb00000000000000004', 'Cadbury cocoa', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000011', 'cseedcb00000000000000004', 'Bournvita', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000012', 'cseedcb00000000000000004', 'Other', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000013', 'cseedcb00000000000000005', 'Local koko', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000014', 'cseedcb00000000000000005', 'Other', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedcp00000000000000015', 'cseedcb00000000000000006', 'Other', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
