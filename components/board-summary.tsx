"use client";

import Link from "next/link";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";
import type { StandardMetrics } from "@/lib/apr-metrics";
import { ThemeToggle } from "./theme-toggle";

const formatDate = (s: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const fmtNum = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString());
const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n.toFixed(0)}%`;

const generatePlaceholderNarrative = (report: AprReport, m: StandardMetrics): string => {
  const type = report.manifest.hmisProjectTypeLabel || "this program";
  const period = `${formatDate(report.manifest.reportStartDate)} to ${formatDate(report.manifest.reportEndDate)}`;
  const lines: string[] = [];
  lines.push(
    `${type} served ${fmtNum(m.activeClients)} active client${m.activeClients === 1 ? "" : "s"} across ${fmtNum(m.activeHouseholds)} household${m.activeHouseholds === 1 ? "" : "s"} during the ${period} reporting period.`
  );
  if (m.stayers !== null) {
    lines.push(
      `${fmtNum(m.stayers)} clients remained in the program (stayers) and ${fmtNum(m.leavers ?? 0)} exited (leavers).`
    );
  }
  if (m.leavers !== null && m.leavers > 0 && m.pctToPermanentHousing !== null) {
    lines.push(
      `Of those who exited, ${fmtPct(m.pctToPermanentHousing)} moved to permanent housing destinations.`
    );
  }
  if (m.veterans !== null && m.veterans > 0) {
    lines.push(`${fmtNum(m.veterans)} active client${m.veterans === 1 ? "" : "s"} are veteran${m.veterans === 1 ? "" : "s"}.`);
  }
  if (m.chronicallyHomeless !== null && m.chronicallyHomeless > 0) {
    lines.push(
      `${fmtNum(m.chronicallyHomeless)} active client${m.chronicallyHomeless === 1 ? "" : "s"} ${m.chronicallyHomeless === 1 ? "is" : "are"} chronically homeless.`
    );
  }
  return lines.join(" ");
};

type Props = {
  report: AprReport;
  reportId: string;
  analysis: AnalysisResult | null;
  metrics: StandardMetrics;
};

const StatBlock = ({
  label,
  value,
  hint,
  large,
}: {
  label: string;
  value: string;
  hint?: string;
  large?: boolean;
}) => (
  <div className={`rounded-xl border border-border bg-card p-4 ${large ? "border-accent/40 bg-accent/5" : ""}`}>
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`mt-1 font-semibold tabular-nums text-foreground ${large ? "text-4xl" : "text-2xl"}`}>{value}</div>
    {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
  </div>
);

export function BoardSummary({ report, reportId, analysis, metrics }: Props) {
  const m = metrics;
  const narrative = analysis?.executiveSummary?.trim() || generatePlaceholderNarrative(report, m);
  const topFindings = analysis?.dataQualityFindings?.slice(0, 3) ?? [];
  const topRecs = analysis?.recommendations?.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-6 print-hide">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
            <div className="text-base font-semibold text-foreground">APR Insight</div>
          </Link>
          <span className="text-xs text-muted-foreground">
            / <Link href={`/reports/${reportId}`} className="hover:text-foreground">Report</Link> / Board summary
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF
          </button>
          <Link
            href={`/reports/${reportId}`}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to full report
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8 print:px-0 print:py-0">
        <section className="board-summary-page rounded-3xl border border-border bg-card p-8 print:border-0 print:p-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Board Summary · {report.manifest.organizationName || "Organization"}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {report.manifest.projectName}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {report.manifest.hmisProjectTypeLabel} · CoC {report.manifest.cocNumber} · Project {report.manifest.projectId}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Reporting period</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">
                {formatDate(report.manifest.reportStartDate)} – {formatDate(report.manifest.reportEndDate)}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Generated {new Date().toLocaleDateString()} by APR Insight
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatBlock label="Active Clients" value={fmtNum(m.activeClients)} large />
            <StatBlock label="Households" value={fmtNum(m.activeHouseholds)} />
            <StatBlock label="Stayers" value={fmtNum(m.stayers)} />
            <StatBlock label="% to PH" value={fmtPct(m.pctToPermanentHousing)} hint={m.leavers ? `${fmtNum(m.positivePHExits)} of ${fmtNum((m.leavers ?? 0) - (m.excludedFromPHDenom ?? 0))} leavers` : undefined} />
            <StatBlock label="Veterans · Chronic" value={`${fmtNum(m.veterans)} · ${fmtNum(m.chronicallyHomeless)}`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Executive narrative
              </div>
              <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {narrative}
              </div>
              {!analysis && (
                <div className="mt-3 text-xs italic text-muted-foreground print-hide">
                  Auto-generated from the report data. For AI-written analysis, run AI Insights from the{" "}
                  <Link href={`/reports/${reportId}`} className="text-accent hover:underline">
                    full report
                  </Link>
                  .
                </div>
              )}
            </div>

            <div className="space-y-3">
              {topRecs.length > 0 && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Top recommendations
                  </div>
                  <ul className="mt-2 space-y-2">
                    {topRecs.map((r, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-semibold text-accent">{r.category}.</span>{" "}
                        <span className="text-foreground">{r.finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {topFindings.length > 0 && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data quality flags
                  </div>
                  <ul className="mt-2 space-y-2">
                    {topFindings.map((f, i) => (
                      <li key={i} className="text-xs">
                        <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          f.severity === "critical"
                            ? "bg-danger/15 text-danger"
                            : f.severity === "warning"
                            ? "bg-warning/15 text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {f.severity}
                        </span>
                        <span className="text-foreground">{f.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {topRecs.length === 0 && topFindings.length === 0 && (
                <div className="rounded-2xl border border-border bg-background p-4 text-xs italic text-muted-foreground">
                  Run AI Insights from the full report to populate top recommendations and data-quality flags in this summary.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <div className="font-semibold text-foreground">HMIS source</div>
              <div className="mt-0.5">{report.manifest.hmisSoftwareNameAndVersion || "—"}</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">Geocode</div>
              <div className="mt-0.5">{report.manifest.geocode || "—"}</div>
            </div>
            <div>
              <div className="font-semibold text-foreground">Source file</div>
              <div className="mt-0.5 truncate font-mono">{report.sourceFileName}</div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-3 text-[10px] text-muted-foreground">
            APR aggregates per HUD CoC-APR Programming Specifications. Percentages follow HUD denominator
            rules (Deceased, Data Not Collected, Client Doesn&apos;t Know/Refused, and No Exit Interview are
            excluded). For per-cell detail, see the full report dashboard.
          </div>
        </section>
      </div>
    </main>
  );
}
