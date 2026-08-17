-- Cloudinary references for attendance selfies and outlet visit photos (legacy BYTEA retained).

ALTER TABLE "LocationPing" ADD COLUMN "selfieCloudinaryPublicId" TEXT;
ALTER TABLE "LocationPing" ADD COLUMN "selfieCloudinaryUrl" TEXT;

ALTER TABLE "OutletVisit" ADD COLUMN "outletPhotoCloudinaryPublicId" TEXT;
ALTER TABLE "OutletVisit" ADD COLUMN "outletPhotoCloudinaryUrl" TEXT;
