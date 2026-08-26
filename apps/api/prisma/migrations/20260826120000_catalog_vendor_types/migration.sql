-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN "vendorTypeGroup" TEXT;

-- CreateIndex
CREATE INDEX "Outlet_vendorTypeGroup_idx" ON "Outlet"("vendorTypeGroup");

-- CreateTable
CREATE TABLE "CatalogVendorType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogVendorType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogVendorTypeValue" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogVendorTypeValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogVendorType_name_key" ON "CatalogVendorType"("name");

-- CreateIndex
CREATE INDEX "CatalogVendorTypeValue_typeId_sortOrder_idx" ON "CatalogVendorTypeValue"("typeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogVendorTypeValue_typeId_name_key" ON "CatalogVendorTypeValue"("typeId", "name");

-- AddForeignKey
ALTER TABLE "CatalogVendorTypeValue" ADD CONSTRAINT "CatalogVendorTypeValue_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "CatalogVendorType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CatalogVendorType" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cseedvt00000000000000001', 'Table top', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "CatalogVendorTypeValue" ("id", "typeId", "name", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cseedvv00000000000000001', 'cseedvt00000000000000001', 'Koko seller', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedvv00000000000000002', 'cseedvt00000000000000001', 'Oats seller', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cseedvv00000000000000003', 'cseedvt00000000000000001', 'Other', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
