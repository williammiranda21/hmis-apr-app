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

  // HUD reports income improvement per cohort: Q19a1 is stayers
  // (annual assessment) and Q19a2 is leavers (exit). ES/TH/RRH
  // typically have leaver data only; PSH typically has stayer data.
  // Use whichever cohort actually has adult clients with income info.
  const tryIncome = (
    q: typeof q19a1
  ): { pct: number | null; adults: number | null } => {
    if (!q || q.notApplicable) return { pct: null, adults: null };
    const row = q.rows.find(
      (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes("any income")
    );
    if (!row) return { pct: null, adults: null };
    const adultsCell = row.cells.find((c) => c.colLabel.toLowerCase().includes("total adults"));
    const pctCell = row.cells.find((c) =>
      c.colLabel.toLowerCase().includes("percent of persons who accomplished")
    );
    return {
      pct: normalizePercent(pctCell?.value ?? null),
      adults: adultsCell?.value ?? null,
    };
  };

  const q19a2 = report.questions["Q19a2"];
  const stayersIncome = tryIncome(q19a1);
  const leaversIncome = tryIncome(q19a2);
  const stayersHasData = (stayersIncome.adults ?? 0) > 0;
  const incomeImprovementPct = stayersHasData ? stayersIncome.pct : leaversIncome.pct;
  const adultsWithAnyIncome = stayersHasData ? stayersIncome.adults : leaversIncome.adults;

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
