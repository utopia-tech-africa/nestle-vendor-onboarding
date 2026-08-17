-- Netles Ghana vendor onboarding extensions
CREATE TYPE "VisitPhotoCategory" AS ENUM ('vendor', 'shop', 'product_display', 'shelf_visibility', 'branding', 'competitor');
CREATE TYPE "TrafficCategory" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "QuestionType" AS ENUM ('text', 'textarea', 'number', 'single_choice', 'multi_choice', 'boolean');
CREATE TYPE "OpsAlertKind" AS ENUM ('missed_check_in', 'incomplete_visit', 'sync_failure', 'new_vendor', 'supervisor');
CREATE TYPE "OpsAlertSeverity" AS ENUM ('info', 'warning', 'critical');

ALTER TABLE "Outlet" ALTER COLUMN "distributorName" SET DEFAULT 'N/A';
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "regionId" TEXT;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "yearsInBusiness" INTEGER;

CREATE INDEX IF NOT EXISTS "Outlet_regionId_idx" ON "Outlet"("regionId");
CREATE INDEX IF NOT EXISTS "Outlet_createdAt_idx" ON "Outlet"("createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "footfallEstimated" INTEGER;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "footfallPeakPeriods" TEXT;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "trafficCategory" "TrafficCategory";
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "footfallManualCount" INTEGER;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "netlesProductAvailable" BOOLEAN;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "productPlacementNotes" TEXT;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "shelfVisibilityNotes" TEXT;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "posMaterialsPresent" BOOLEAN;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "promotionalMaterialsPresent" BOOLEAN;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "stockLevelNotes" TEXT;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "outOfStock" BOOLEAN;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "visibilityScore" DOUBLE PRECISION;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "isComplete" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OutletVisit" ADD COLUMN IF NOT EXISTS "incompleteReasons" TEXT;

CREATE INDEX IF NOT EXISTS "OutletVisit_checkedInAt_idx" ON "OutletVisit"("checkedInAt" DESC);

CREATE TABLE IF NOT EXISTS "OutletVisitPhoto" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "category" "VisitPhotoCategory" NOT NULL,
  "cloudinaryPublicId" TEXT,
  "cloudinaryUrl" TEXT,
  "mimeType" TEXT,
  "imageBytes" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutletVisitPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OutletVisitPhoto_visitId_category_idx" ON "OutletVisitPhoto"("visitId", "category");

DO $$ BEGIN
  ALTER TABLE "OutletVisitPhoto" ADD CONSTRAINT "OutletVisitPhoto_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "OutletVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CompetitorObservation" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "pricingNotes" TEXT,
  "promotionsNotes" TEXT,
  "discountsNotes" TEXT,
  "newLaunchesNotes" TEXT,
  "displayQualityNotes" TEXT,
  "marketObservations" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompetitorObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompetitorObservation_visitId_idx" ON "CompetitorObservation"("visitId");

DO $$ BEGIN
  ALTER TABLE "CompetitorObservation" ADD CONSTRAINT "CompetitorObservation_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "OutletVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Questionnaire" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireQuestion" (
  "id" TEXT NOT NULL,
  "questionnaireId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "helpText" TEXT,
  "type" "QuestionType" NOT NULL DEFAULT 'text',
  "optionsJson" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_questionnaireId_sortOrder_idx"
  ON "QuestionnaireQuestion"("questionnaireId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey"
    FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "QuestionnaireResponse" (
  "id" TEXT NOT NULL,
  "questionnaireId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionnaireResponse_visitId_questionnaireId_key"
  ON "QuestionnaireResponse"("visitId", "questionnaireId");
CREATE INDEX IF NOT EXISTS "QuestionnaireResponse_questionnaireId_idx" ON "QuestionnaireResponse"("questionnaireId");

DO $$ BEGIN
  ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_questionnaireId_fkey"
    FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "OutletVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "QuestionnaireAnswer" (
  "id" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "valueText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionnaireAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionnaireAnswer_responseId_questionId_key"
  ON "QuestionnaireAnswer"("responseId", "questionId");
CREATE INDEX IF NOT EXISTS "QuestionnaireAnswer_questionId_idx" ON "QuestionnaireAnswer"("questionId");

DO $$ BEGIN
  ALTER TABLE "QuestionnaireAnswer" ADD CONSTRAINT "QuestionnaireAnswer_responseId_fkey"
    FOREIGN KEY ("responseId") REFERENCES "QuestionnaireResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "QuestionnaireAnswer" ADD CONSTRAINT "QuestionnaireAnswer_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "QuestionnaireQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OpsAlert" (
  "id" TEXT NOT NULL,
  "kind" "OpsAlertKind" NOT NULL,
  "severity" "OpsAlertSeverity" NOT NULL DEFAULT 'info',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metaJson" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpsAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OpsAlert_createdAt_idx" ON "OpsAlert"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "OpsAlert_isRead_createdAt_idx" ON "OpsAlert"("isRead", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "OpsAlert_kind_createdAt_idx" ON "OpsAlert"("kind", "createdAt" DESC);
