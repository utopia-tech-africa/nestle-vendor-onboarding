-- Store GPS coordinates on outlets (field promoters capture at creation time).
ALTER TABLE "Outlet"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;
