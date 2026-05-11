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
  /** % of adults who gained or increased total income (from whichever cohort has more data). */
  incomeImprovementPct: number | null;
  /** Denominator adults for the income metric (Total Adults with income info). */
  adultsWithAnyIncome: number | null;
  /** Numerator: count of adults who actually gained or increased income. */
  adultsImprovedIncome: number | null;
  /** Which cohort the income metric is reporting. */
  incomeCohort: "stayers" | "leavers" | null;
  /** Both cohort values, for optional display. */
  stayersIncomePct: number | null;
  stayersIncomeAdults: number | null;
  leaversIncomePct: number | null;
  leaversIncomeAdults: number | null;
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
  ): { pct: number | null; adults: number | null; improved: number | null } => {
    if (!q || q.notApplicable) return { pct: null, adults: null, improved: null };
    const row = q.rows.find(
      (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes("any income")
    );
    if (!row) return { pct: null, adults: null, improved: null };
    const adultsCell = row.cells.find((c) => c.colLabel.toLowerCase().includes("total adults"));
    const pctCell = row.cells.find((c) =>
      c.colLabel.toLowerCase().includes("percent of persons who accomplished")
    );
    // "Performance Measure: Adults who Gained or Increased Income from
    // Start to Exit, Average Gain" — for the "Number of Adults with X
    // Income" rows this cell holds the COUNT of adults who improved.
    const improvedCell = row.cells.find((c) =>
      c.colLabel.toLowerCase().includes("adults who gained or increased income")
    );
    return {
      pct: normalizePercent(pctCell?.value ?? null),
      adults: adultsCell?.value ?? null,
      improved: improvedCell?.value ?? null,
    };
  };

  const q19a2 = report.questions["Q19a2"];
  const stayersIncome = tryIncome(q19a1);
  const leaversIncome = tryIncome(q19a2);
  const stayersAdults = stayersIncome.adults ?? 0;
  const leaversAdults = leaversIncome.adults ?? 0;

  // Display the cohort that actually has data. If both cohorts have adults,
  // use the larger one. This matches what users see in the source Q19a1/a2
  // tables — no averaging that dilutes either number.
  let incomeImprovementPct: number | null = null;
  let adultsWithAnyIncome: number | null = null;
  let adultsImprovedIncome: number | null = null;
  let incomeCohort: "stayers" | "leavers" | null = null;
  if (leaversAdults > stayersAdults) {
    incomeImprovementPct = leaversIncome.pct;
    adultsWithAnyIncome = leaversIncome.adults;
    adultsImprovedIncome = leaversIncome.improved;
    incomeCohort = "leavers";
  } else if (stayersAdults > 0) {
    incomeImprovementPct = stayersIncome.pct;
    adultsWithAnyIncome = stayersIncome.adults;
    adultsImprovedIncome = stayersIncome.improved;
    incomeCohort = "stayers";
  } else if (leaversAdults > 0) {
    incomeImprovementPct = leaversIncome.pct;
    adultsWithAnyIncome = leaversIncome.adults;
    adultsImprovedIncome = leaversIncome.improved;
    incomeCohort = "leavers";
  }

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
    adultsImprovedIncome,
    incomeCohort,
    stayersIncomePct: stayersIncome.pct,
    stayersIncomeAdults: stayersIncome.adults,
    leaversIncomePct: leaversIncome.pct,
    leaversIncomeAdults: leaversIncome.adults,
  };
};

export type ReportMetricsRow = StandardMetrics & {
  reportRunId: string;
  reportStartDate: string;
  reportEndDate: string;
  uploadedAt: string;
};
