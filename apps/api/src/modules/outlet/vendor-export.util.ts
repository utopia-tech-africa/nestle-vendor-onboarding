import { vendorTypeExportLabel } from "./field-catalogs";

const PHOTO_CATEGORY_LABELS: Record<string, string> = {
  vendor: "Vendor photo",
  shop: "Store photo",
  product_display: "Product display",
  shelf_visibility: "Shelf visibility",
  branding: "Branding materials",
  competitor: "Competitor photo"
};

export type VendorExportVisitInput = {
  kind: string;
  checkedInAt: Date;
  hasOutletPhoto: boolean;
  photoCount: number;
};

export type VendorExportSource = {
  id: string;
  vendorCode: string;
  name: string;
  vendorTypeGroup?: string | null;
  category: string;
  locationArea: string;
  district: string | null;
  yearsInBusiness: number | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPhoneSecondary: string | null;
  vendorRole: string | null;
  gender: string | null;
  ageBracket: string | null;
  employeeCountBracket: string | null;
  averageDailySalesBracket: string | null;
  landmark: string | null;
  isActive: boolean;
  createdAt: Date;
  region?: { name: string } | null;
  createdBy?: { fullName: string; region?: { name: string } | null } | null;
  onboardingPhotos: { category: string }[];
  visits: VendorExportVisitInput[];
};

export type VendorExportRow = {
  vendorId: string;
  id: string;
  businessName: string;
  vendorName: string;
  phone: string;
  phoneSecondary: string;
  role: string;
  gender: string;
  ageBracket: string;
  employees: string;
  avgSalesDayGhs: string;
  landmark: string;
  promoterRegion: string;
  vendorRegion: string;
  district: string;
  community: string;
  vendorType: string;
  yearsInBusiness: string | number;
  latitude: string | number;
  longitude: string | number;
  createdAt: string;
  promoter: string;
  isActive: string;
  photoCount: number;
  hasPhotos: string;
  photoCategories: string;
  visitCount: number;
  onboardingVisits: number;
  itemsGivenVisits: number;
  visitsWithPhotos: number;
  visitPhotoCount: number;
  lastVisitAt: string;
  lastVisitKind: string;
};

export type VendorExportSummary = {
  vendors: number;
  vendorsWithPhotos: number;
  vendorsWithoutPhotos: number;
  visits: number;
  onboardingVisits: number;
  itemsGivenVisits: number;
  visitsWithPhotos: number;
};

const visitKindLabel = (kind: string): string =>
  kind === "items" ? "Items given" : "Onboarding";

export const toVendorExportRow = (
  vendor: VendorExportSource,
  hidePersonalContact: boolean
): VendorExportRow => {
  const photos = vendor.onboardingPhotos;
  const visits = [...vendor.visits].sort(
    (left, right) => right.checkedInAt.getTime() - left.checkedInAt.getTime()
  );
  const lastVisit = visits[0];
  const onboardingVisits = visits.filter((visit) => visit.kind !== "items").length;
  const itemsGivenVisits = visits.filter((visit) => visit.kind === "items").length;
  const visitsWithPhotos = visits.filter(
    (visit) => visit.hasOutletPhoto || visit.photoCount > 0
  ).length;
  const visitPhotoCount = visits.reduce((sum, visit) => sum + visit.photoCount, 0);
  const categories = [
    ...new Set(
      photos.map((photo) => PHOTO_CATEGORY_LABELS[photo.category] ?? photo.category)
    )
  ];

  return {
    vendorId: vendor.vendorCode,
    id: vendor.id,
    businessName: vendor.name,
    vendorName: hidePersonalContact ? "" : (vendor.contactName ?? ""),
    phone: hidePersonalContact ? "" : (vendor.contactPhone ?? ""),
    phoneSecondary: hidePersonalContact ? "" : (vendor.contactPhoneSecondary ?? ""),
    role: vendor.vendorRole ?? "",
    gender: vendor.gender ?? "",
    ageBracket: vendor.ageBracket ?? "",
    employees: vendor.employeeCountBracket ?? "",
    avgSalesDayGhs: vendor.averageDailySalesBracket ?? "",
    landmark: vendor.landmark ?? "",
    promoterRegion: vendor.createdBy?.region?.name ?? "",
    vendorRegion: vendor.region?.name ?? "",
    district: vendor.district ?? "",
    community: vendor.locationArea,
    vendorType: vendorTypeExportLabel(vendor),
    yearsInBusiness: vendor.yearsInBusiness ?? "",
    latitude: vendor.latitude ?? "",
    longitude: vendor.longitude ?? "",
    createdAt: vendor.createdAt.toISOString(),
    promoter: vendor.createdBy?.fullName ?? "",
    isActive: vendor.isActive ? "yes" : "no",
    photoCount: photos.length,
    hasPhotos: photos.length > 0 ? "yes" : "no",
    photoCategories: categories.join("; "),
    visitCount: visits.length,
    onboardingVisits,
    itemsGivenVisits,
    visitsWithPhotos,
    visitPhotoCount,
    lastVisitAt: lastVisit?.checkedInAt.toISOString() ?? "",
    lastVisitKind: lastVisit === undefined ? "" : visitKindLabel(lastVisit.kind)
  };
};

export const summarizeVendorExport = (rows: VendorExportRow[]): VendorExportSummary => {
  return {
    vendors: rows.length,
    vendorsWithPhotos: rows.filter((row) => row.photoCount > 0).length,
    vendorsWithoutPhotos: rows.filter((row) => row.photoCount === 0).length,
    visits: rows.reduce((sum, row) => sum + row.visitCount, 0),
    onboardingVisits: rows.reduce((sum, row) => sum + row.onboardingVisits, 0),
    itemsGivenVisits: rows.reduce((sum, row) => sum + row.itemsGivenVisits, 0),
    visitsWithPhotos: rows.reduce((sum, row) => sum + row.visitsWithPhotos, 0)
  };
};

export const csvCell = (value: string | number | null | undefined): string => {
  const raw = value == null ? "" : String(value);
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
};

export const VENDOR_EXPORT_CSV_HEADER =
  "vendorId,id,businessName,vendorName,phone,phoneSecondary,role,gender,ageBracket,employees,avgSalesDayGhs,landmark,region,district,community,vendorType,yearsInBusiness,latitude,longitude,createdAt,promoter,isActive,photoCount,hasPhotos,photoCategories,visitCount,onboardingVisits,itemsGivenVisits,visitsWithPhotos,visitPhotoCount,lastVisitAt,lastVisitKind";

export const vendorExportCsvRow = (row: VendorExportRow): string =>
  [
    csvCell(row.vendorId),
    csvCell(row.id),
    csvCell(row.businessName),
    csvCell(row.vendorName),
    csvCell(row.phone),
    csvCell(row.phoneSecondary),
    csvCell(row.role),
    csvCell(row.gender),
    csvCell(row.ageBracket),
    csvCell(row.employees),
    csvCell(row.avgSalesDayGhs),
    csvCell(row.landmark),
    csvCell(row.promoterRegion),
    csvCell(row.district),
    csvCell(row.community),
    csvCell(row.vendorType),
    csvCell(row.yearsInBusiness),
    csvCell(row.latitude),
    csvCell(row.longitude),
    csvCell(row.createdAt),
    csvCell(row.promoter),
    csvCell(row.isActive),
    csvCell(row.photoCount),
    csvCell(row.hasPhotos),
    csvCell(row.photoCategories),
    csvCell(row.visitCount),
    csvCell(row.onboardingVisits),
    csvCell(row.itemsGivenVisits),
    csvCell(row.visitsWithPhotos),
    csvCell(row.visitPhotoCount),
    csvCell(row.lastVisitAt),
    csvCell(row.lastVisitKind)
  ].join(",");
