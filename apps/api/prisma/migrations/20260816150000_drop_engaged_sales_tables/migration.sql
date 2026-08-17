-- Drop unused Engaged Sales tables (activations, stock, sales, reports, subwholesales).

DROP TABLE IF EXISTS "SaleItem" CASCADE;
DROP TABLE IF EXISTS "Sale" CASCADE;
DROP TABLE IF EXISTS "StockPickupItem" CASCADE;
DROP TABLE IF EXISTS "StockPickup" CASCADE;
DROP TABLE IF EXISTS "PickupStore" CASCADE;
DROP TABLE IF EXISTS "ActivationProduct" CASCADE;
DROP TABLE IF EXISTS "ActivationRoster" CASCADE;
DROP TABLE IF EXISTS "ActivationRegion" CASCADE;
DROP TABLE IF EXISTS "ActivationGeofence" CASCADE;
DROP TABLE IF EXISTS "Activation" CASCADE;
DROP TABLE IF EXISTS "Subwholesale" CASCADE;
DROP TABLE IF EXISTS "ReportRecipient" CASCADE;
DROP TABLE IF EXISTS "ReportConfig" CASCADE;

DROP TYPE IF EXISTS "ReportFrequency";
