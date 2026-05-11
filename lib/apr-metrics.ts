import type { AprQuestion, AprReport } from "@/lib/apr-schema/types";

export type StandardMetrics = {
  activeClients: number;
  activeHouseholds: number;
  stayers: number | null;
  leavers: number | null;
  veterans: number | null;
  chronicallyHomeless: number | null;
  pctToPermanentHousing: number | null;
  positivePHExits: number | null;
  excludedFromPHDenom: number | null;
  averageLengthOfStayDays: number | null;
};

const findRow = (q: AprQuestion | undefined, needle: string) => {
  if (!q) return undefined;
  const lc = needle.toLowerCase();
  return q.rows.find((r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes(lc));
};

const findCell = (q: AprQuestion | undefined, rowNeedle: string, colNeedle = "total") => {
  const row = findRow(q, rowNeedle);
  if (!row) return null;
  const cell = row.cells.find((c) => c.colLabel.toLowerCase() === colNeedle.toLowerCase());
  if (!cell) return row.cells[0]?.value ?? null;
  return cell.value;
};

const normalizePercent = (v: number | null): number | null => {
  if (v === null) return null;
  return v > 0 && v < 1 ? v * 100 : v;
};

export const extractMetrics = (report: AprReport): StandardMetrics => {
  const q5a = report.questions["Q5a"];
  const q22b = report.questions["Q22b"];
  const q23c = report.questions["Q23c"];

  const stayers = findCell(q5a, "Number of Stayers", "count of clients");
  const leavers = findCell(q5a, "Number of Leavers", "count of clients");
  const veterans = findCell(q5a, "Number of Veterans", "count of clients");
  const chronic = findCell(q5a, "Number of Chronically Homeless", "count of clients");

  const positivePH = findCell(q23c, "exiting to positive housing destinations");
  const excluded = findCell(q23c, "destinations that excluded them");
  const pctRaw = findCell(q23c, "percentage of persons exiting to positive");
  const pct = normalizePercent(pctRaw);

  const avgLOS = findCell(q22b, "average length");

  return {
    activeClients: report.manifest.totalActiveClients,
    activeHouseholds: report.manifest.totalActiveHouseholds,
    stayers,
    leavers,
    veterans,
    chronicallyHomeless: chronic,
    pctToPermanentHousing: pct,
    positivePHExits: positivePH,
    excludedFromPHDenom: excluded,
    averageLengthOfStayDays: avgLOS,
  };
};

export type ReportMetricsRow = StandardMetrics & {
  reportRunId: string;
  reportStartDate: string;
  reportEndDate: string;
  uploadedAt: string;
};
