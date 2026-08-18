-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Outlet_createdByUserId_idx" ON "Outlet"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from new-vendor ops alerts (who actually registered the vendor).
UPDATE "Outlet" o
SET "createdByUserId" = a."createdByUserId"
FROM (
  SELECT DISTINCT ON ((a."metaJson"::json->>'outletId'))
    a."metaJson"::json->>'outletId' AS "outletId",
    a."metaJson"::json->>'createdByUserId' AS "createdByUserId"
  FROM "OpsAlert" a
  WHERE a.kind = 'new_vendor'
    AND a."metaJson" IS NOT NULL
    AND a."metaJson"::json->>'outletId' IS NOT NULL
    AND a."metaJson"::json->>'createdByUserId' IS NOT NULL
  ORDER BY (a."metaJson"::json->>'outletId'), a."createdAt" ASC
) a
WHERE o.id = a."outletId"
  AND o."createdByUserId" IS NULL
  AND EXISTS (SELECT 1 FROM "User" u WHERE u.id = a."createdByUserId");

-- Fallback: earliest promoter visit (legacy vendors with no onboarding alert).
UPDATE "Outlet" o
SET "createdByUserId" = v."userId"
FROM (
  SELECT DISTINCT ON (v."outletId")
    v."outletId",
    v."userId"
  FROM "OutletVisit" v
  INNER JOIN "User" u ON u.id = v."userId"
  WHERE u.role = 'promoter'
  ORDER BY v."outletId", v."checkedInAt" ASC
) v
WHERE o.id = v."outletId"
  AND o."createdByUserId" IS NULL;
