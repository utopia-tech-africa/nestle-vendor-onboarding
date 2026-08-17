-- Admin-managed stores where promoters pick up stock.
CREATE TABLE "PickupStore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationArea" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupStore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PickupStore_isActive_name_idx" ON "PickupStore"("isActive", "name");

ALTER TABLE "StockPickup" ADD COLUMN "pickupStoreId" TEXT;

ALTER TABLE "StockPickup" ADD CONSTRAINT "StockPickup_pickupStoreId_fkey"
FOREIGN KEY ("pickupStoreId") REFERENCES "PickupStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StockPickup_pickupStoreId_idx" ON "StockPickup"("pickupStoreId");
