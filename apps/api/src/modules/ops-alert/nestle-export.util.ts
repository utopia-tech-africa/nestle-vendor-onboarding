import PDFDocument from "pdfkit";

export type NestleOverviewPayload = {
  vendorsOnboarded: number;
  activePromoters: number;
  dailyVisits: number;
  completedQuestionnaires: number;
  visibilityScoreAvg: number | null;
  competitorReports: number;
  footfall: {
    estimatedAvg: number | null;
    estimatedSum: number | null;
    manualSum: number | null;
  };
  incompleteVisits: number;
  unreadAlerts: number;
  regionalPerformance: {
    regionId: string | null;
    regionName: string;
    vendorCount: number;
  }[];
};

export type NestlePdfFilterLabels = {
  from?: string;
  to?: string;
  regionName?: string;
  promoterName?: string;
};

const fmt = (value: number | null | undefined, digits = 0): string => {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return digits > 0 ? value.toFixed(digits) : String(Math.round(value));
};

export const buildNestleOverviewPdf = async (
  payload: NestleOverviewPayload,
  filters: NestlePdfFilterLabels = {}
): Promise<Buffer> => {
  const generatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const rangeParts: string[] = [];
  if (filters.from) rangeParts.push(`From ${filters.from}`);
  if (filters.to) rangeParts.push(`To ${filters.to}`);
  if (filters.regionName) rangeParts.push(`Region: ${filters.regionName}`);
  if (filters.promoterName) rangeParts.push(`Promoter: ${filters.promoterName}`);
  const filterLine = rangeParts.length > 0 ? rangeParts.join(" · ") : "All dates and regions";

  const regionalLines =
    payload.regionalPerformance.length === 0
      ? ["- No regional vendor data yet"]
      : [...payload.regionalPerformance]
          .sort((a, b) => b.vendorCount - a.vendorCount)
          .map((row) => `- ${row.regionName}: ${String(row.vendorCount)} vendors`);

  const lines = [
    "Nestlé Ghana — Vendor Onboarding Report",
    `Generated: ${generatedAt}`,
    `Filters: ${filterLine}`,
    "",
    "Programme KPIs",
    `- Vendors onboarded: ${String(payload.vendorsOnboarded)}`,
    `- Active promoters: ${String(payload.activePromoters)}`,
    `- Visits today (UTC): ${String(payload.dailyVisits)}`,
    `- Completed questionnaires: ${String(payload.completedQuestionnaires)}`,
    `- Incomplete visits: ${String(payload.incompleteVisits)}`,
    `- Competitor reports: ${String(payload.competitorReports)}`,
    `- Unread ops alerts: ${String(payload.unreadAlerts)}`,
    "",
    "Visibility & footfall",
    `- Average visibility score: ${
      payload.visibilityScoreAvg != null ? `${fmt(payload.visibilityScoreAvg)}%` : "—"
    }`,
    `- Estimated footfall (avg): ${fmt(payload.footfall.estimatedAvg)}`,
    `- Estimated footfall (sum): ${fmt(payload.footfall.estimatedSum)}`,
    `- Manual footfall (sum): ${fmt(payload.footfall.manualSum)}`,
    "",
    "Vendor distribution by region",
    ...regionalLines,
    "",
    "Notes",
    "- Detail rows (visits, vendors, competitors) are available via CSV export.",
    "- Excel pack mirrors these KPIs and the regional distribution table."
  ];

  return createSimplePdf(lines);
};

const createSimplePdf = (lines: string[]): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4", info: { Title: "Nestlé Ghana Report" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("error", (error) => {
      reject(error);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.fontSize(16).text(lines[0] ?? "Nestlé Ghana Report", { underline: false });
    doc.moveDown(0.4);
    doc.fontSize(10);
    for (const line of lines.slice(1)) {
      if (line.length === 0) {
        doc.moveDown(0.55);
        continue;
      }
      if (
        line === "Programme KPIs" ||
        line === "Visibility & footfall" ||
        line === "Vendor distribution by region" ||
        line === "Notes"
      ) {
        doc.moveDown(0.2);
        doc.fontSize(12).text(line);
        doc.fontSize(10);
        continue;
      }
      doc.text(line);
    }
    doc.end();
  });
