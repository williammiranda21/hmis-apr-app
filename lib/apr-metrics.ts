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
  /** Q19a1: % of adult stayers who gained or increased total income from start to annual assessment. */
  incomeImprovementPct: number | null;
  /** Q19a1: count of adult stayers with any income at annual assessment (denominator basis). */
  adultsWithAnyIncome: number | null;
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
  const q19a1 = report.questions["Q19a1"];
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

  // Q19a1: pull the "Number of Adults with Any Income" row and its
  // "Performance measure: Percent of Persons who Accomplished this
  // Measure" column. That cell is HUD's headline income-improvement
  // metric for stayers.
  const anyIncomeRow = q19a1?.rows.find(
    (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes("number of adults with any income")
  );
  const incomePctCell = anyIncomeRow?.cells.find((c) =>
    c.colLabel.toLowerCase().includes("percent of persons who accomplished")
  );
  const incomeImprovementPct = normalizePercent(incomePctCell?.value ?? null);
  const adultsWithAnyIncome =
    anyIncomeRow?.cells.find((c) => c.colLabel.toLowerCase().includes("total adults"))?.value ?? null;

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
    incomeImprovementPct,
    adultsWithAnyIncome,
  };
};

export type ReportMetricsRow = StandardMetrics & {
  reportRunId: string;
  reportStartDate: string;
  reportEndDate: string;
  uploadedAt: string;
};
