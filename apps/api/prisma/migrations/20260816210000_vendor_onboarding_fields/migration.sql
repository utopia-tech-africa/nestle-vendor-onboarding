-- CreateEnum
CREATE TYPE "VendorRole" AS ENUM ('owner', 'worker');

-- CreateEnum
CREATE TYPE "AgeBracket" AS ENUM ('under_18', 'age_18_24', 'age_25_34', 'age_35_44', 'age_45_54', 'age_55_plus');

-- CreateEnum
CREATE TYPE "EmployeeCountBracket" AS ENUM ('none', 'one_two', 'three_five', 'six_ten', 'eleven_plus');

-- CreateEnum
CREATE TYPE "AverageDailySalesBracket" AS ENUM ('under_50', 'from_50_100', 'from_100_200', 'from_200_500', 'from_500_plus');

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN "contactPhoneSecondary" TEXT;
ALTER TABLE "Outlet" ADD COLUMN "vendorRole" "VendorRole";
ALTER TABLE "Outlet" ADD COLUMN "gender" "Gender";
ALTER TABLE "Outlet" ADD COLUMN "ageBracket" "AgeBracket";
ALTER TABLE "Outlet" ADD COLUMN "employeeCountBracket" "EmployeeCountBracket";
ALTER TABLE "Outlet" ADD COLUMN "averageDailySalesBracket" "AverageDailySalesBracket";
ALTER TABLE "Outlet" ADD COLUMN "landmark" TEXT;

-- AlterTable
ALTER TABLE "OutletVisit" ADD COLUMN "nestleProductsJson" TEXT;

-- AlterTable
ALTER TABLE "CompetitorObservation" ADD COLUMN "brandNameOther" TEXT;
ALTER TABLE "CompetitorObservation" ADD COLUMN "productsJson" TEXT;

-- CreateTable
CREATE TABLE "OutletOnboardingPhoto" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "category" "VisitPhotoCategory" NOT NULL DEFAULT 'vendor',
    "cloudinaryPublicId" TEXT,
    "cloudinaryUrl" TEXT,
    "mimeType" TEXT,
    "imageBytes" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutletOnboardingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutletOnboardingPhoto_outletId_category_idx" ON "OutletOnboardingPhoto"("outletId", "category");

-- AddForeignKey
ALTER TABLE "OutletOnboardingPhoto" ADD CONSTRAINT "OutletOnboardingPhoto_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
