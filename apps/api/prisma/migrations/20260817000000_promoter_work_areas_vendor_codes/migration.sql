-- AlterTable
ALTER TABLE "Region" ADD COLUMN "code" TEXT;

-- Backfill Ghana region prefixes (Accra → GA-001).
UPDATE "Region" SET "code" = CASE "slug"
  WHEN 'ahafo' THEN 'AH'
  WHEN 'ashanti' THEN 'AS'
  WHEN 'bono' THEN 'BO'
  WHEN 'bono-east' THEN 'BE'
  WHEN 'central' THEN 'CR'
  WHEN 'eastern' THEN 'ER'
  WHEN 'greater-accra' THEN 'GA'
  WHEN 'north-east' THEN 'NE'
  WHEN 'northern' THEN 'NR'
  WHEN 'oti' THEN 'OT'
  WHEN 'savannah' THEN 'SV'
  WHEN 'upper-east' THEN 'UE'
  WHEN 'upper-west' THEN 'UW'
  WHEN 'volta' THEN 'VR'
  WHEN 'western' THEN 'WR'
  WHEN 'western-north' THEN 'WN'
  ELSE UPPER(LEFT(REPLACE("slug", '-', ''), 2))
END
WHERE "code" IS NULL;

-- Disambiguate any remaining duplicate derived codes.
WITH ranked AS (
  SELECT
    id,
    "code",
    ROW_NUMBER() OVER (PARTITION BY "code" ORDER BY "createdAt", id) AS n
  FROM "Region"
)
UPDATE "Region" r
SET "code" = ranked."code" || ranked.n::text
FROM ranked
WHERE r.id = ranked.id AND ranked.n > 1;

ALTER TABLE "Region" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateTable
CREATE TABLE "VendorCodeCounter" (
    "prefix" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VendorCodeCounter_pkey" PRIMARY KEY ("prefix")
);

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN "vendorCode" TEXT;

WITH numbered AS (
  SELECT
    o.id,
    COALESCE(r."code", 'UN') AS prefix,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(r."code", 'UN')
      ORDER BY o."createdAt" ASC, o.id ASC
    ) AS seq
  FROM "Outlet" o
  LEFT JOIN "Region" r ON r.id = o."regionId"
)
UPDATE "Outlet" o
SET "vendorCode" = numbered.prefix || '-' || LPAD(numbered.seq::text, 3, '0')
FROM numbered
WHERE o.id = numbered.id;

ALTER TABLE "Outlet" ALTER COLUMN "vendorCode" SET NOT NULL;
CREATE UNIQUE INDEX "Outlet_vendorCode_key" ON "Outlet"("vendorCode");

INSERT INTO "VendorCodeCounter" ("prefix", "lastSeq")
SELECT
  split_part("vendorCode", '-', 1) AS prefix,
  MAX(CAST(split_part("vendorCode", '-', 2) AS INTEGER)) AS "lastSeq"
FROM "Outlet"
GROUP BY split_part("vendorCode", '-', 1)
ON CONFLICT ("prefix") DO UPDATE SET "lastSeq" = EXCLUDED."lastSeq";

-- CreateTable
CREATE TABLE "_PromoterWorkAreas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PromoterWorkAreas_AB_unique" ON "_PromoterWorkAreas"("A", "B");

-- CreateIndex
CREATE INDEX "_PromoterWorkAreas_B_index" ON "_PromoterWorkAreas"("B");

-- AddForeignKey
ALTER TABLE "_PromoterWorkAreas" ADD CONSTRAINT "_PromoterWorkAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromoterWorkAreas" ADD CONSTRAINT "_PromoterWorkAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
