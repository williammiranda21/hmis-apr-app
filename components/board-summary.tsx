"use client";

import Link from "next/link";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";
import type { StandardMetrics } from "@/lib/apr-metrics";
import { ThemeToggle } from "./theme-toggle";
import { formatAprDate } from "@/lib/date-utils";
import {
  UsersIcon,
  HomeIcon,
  CheckCircleIcon,
  ShieldIcon,
  StarIcon,
  ClockIcon,
  AlertIcon,
  SparkleIcon,
} from "./icons";
import { DestinationChart, LengthOfStayChart } from "./featured-charts";

const fmtNum = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString();

const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n.toFixed(0)}%`;

const fmtDuration = (days: number | null | undefined): string => {
  if (days === null || days === undefined) return "—";
  if (days < 60) return `${Math.round(days)} d`;
  if (days < 730) return `${(days / 30).toFixed(1)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
};

type Tone = "accent" | "neutral";

const KpiTile = ({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: Tone;
  progress?: number;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl border p-4 ${
      tone === "accent"
        ? "border-accent/30 bg-gradient-to-br from-accent/10 to-transparent"
        : "border-border bg-card"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          tone === "accent" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      {progress !== undefined && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          target
        </span>
      )}
    </div>
    <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-0.5 text-3xl font-semibold tabular-nums text-foreground">{value}</div>
    {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    {progress !== undefined && (
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

const generatePlaceholderNarrative = (report: AprReport, m: StandardMetrics): string => {
  const type = report.manifest.hmisProjectTypeLabel || "this program";
  const parts: string[] = [];
  parts.push(
    `${type} served ${fmtNum(m.activeClients)} clients across ${fmtNum(m.activeHouseholds)} households this period.`
  );
  if (m.leavers !== null && m.leavers > 0 && m.pctToPermanentHousing !== null) {
    parts.push(
      `${fmtPct(m.pctToPermanentHousing)} of qualifying leavers exited to permanent housing.`
    );
  } else if (m.stayers !== null) {
    parts.push(`${fmtNum(m.stayers)} clients are still in program; ${fmtNum(m.leavers ?? 0)} exited.`);
  }
  if (m.veterans !== null && m.veterans > 0) {
    parts.push(`Includes ${fmtNum(m.veterans)} veteran client${m.veterans === 1 ? "" : "s"}.`);
  }
  if (m.chronicallyHomeless !== null && m.chronicallyHomeless > 0) {
    parts.push(`${fmtNum(m.chronicallyHomeless)} client${m.chronicallyHomeless === 1 ? " is" : "s are"} chronically homeless.`);
  }
  return parts.join(" ");
};

type Props = {
  report: AprReport;
  reportId: string;
  analysis: AnalysisResult | null;
  metrics: StandardMetrics;
};

export function BoardSummary({ report, reportId, analysis, metrics }: Props) {
  const m = metrics;
  const narrative = analysis?.executiveSummary?.trim() || generatePlaceholderNarrative(report, m);
  const topFindings = analysis?.dataQualityFindings?.slice(0, 3) ?? [];
  const topRecs = analysis?.recommendations?.slice(0, 3) ?? [];

  const retentionPct =
    m.stayers !== null && m.activeClients > 0 ? Math.round((m.stayers / m.activeClients) * 100) : null;

  const q23c = report.questions["Q23c"];
  const q22a1 = report.questions["Q22a1"];
  const hasLeavers = (m.leavers ?? 0) > 0;
  const headlineChart = hasLeavers && q23c ? "destinations" : q22a1 ? "los" : null;

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
            / <Link href={`/reports/${reportId}`} className="hover:text-foreground">Report</Link> / Executive summary
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

      <div className="mx-auto max-w-6xl px-6 py-8 print:px-0 print:py-0">
        <section className="rounded-3xl border border-border bg-card p-8 print:border-0 print:p-0">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Executive Summary
              </div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                {report.manifest.projectName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {report.manifest.hmisProjectTypeLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {report.manifest.organizationName} · CoC {report.manifest.cocNumber} · Project {report.manifest.projectId}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reporting period
              </div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">
                {formatAprDate(report.manifest.reportStartDate)} – {formatAprDate(report.manifest.reportEndDate)}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Generated {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile
              label="Active Clients"
              value={fmtNum(m.activeClients)}
              hint={`${fmtNum(m.activeHouseholds)} households`}
              icon={<UsersIcon size={16} />}
              tone="accent"
            />
            <KpiTile
              label="Stayers"
              value={fmtNum(m.stayers)}
              hint={retentionPct !== null ? `${retentionPct}% retention` : undefined}
              icon={<CheckCircleIcon size={16} />}
            />
            <KpiTile
              label="Leavers"
              value={fmtNum(m.leavers)}
              hint={
                m.excludedFromPHDenom !== null && m.excludedFromPHDenom > 0
                  ? `${m.excludedFromPHDenom} excluded from PH denom`
                  : undefined
              }
              icon={<HomeIcon size={16} />}
            />
            <KpiTile
              label="% to Permanent Housing"
              value={fmtPct(m.pctToPermanentHousing)}
              hint={
                m.positivePHExits !== null && hasLeavers
                  ? `${m.positivePHExits} of ${(m.leavers ?? 0) - (m.excludedFromPHDenom ?? 0)}`
                  : undefined
              }
              icon={<ShieldIcon size={16} />}
              progress={m.pctToPermanentHousing ?? undefined}
            />
            <KpiTile
              label="Avg Length of Stay"
              value={fmtDuration(m.averageLengthOfStayDays)}
              hint={
                m.averageLengthOfStayDays !== null
                  ? `${Math.round(m.averageLengthOfStayDays)} days`
                  : undefined
              }
              icon={<ClockIcon size={16} />}
            />
            <KpiTile
              label="Veterans · Chronic"
              value={`${fmtNum(m.veterans)} · ${fmtNum(m.chronicallyHomeless)}`}
              icon={<StarIcon size={16} />}
            />
          </div>

          {/* Narrative + headline chart */}
          <div className="mt-6 grid gap-5 lg:grid-cols-5">
            <div className="rounded-2xl border border-border bg-background p-5 lg:col-span-2">
              <div className="flex items-center gap-2">
                <SparkleIcon size={14} className="text-accent" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Narrative
                </div>
              </div>
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {narrative}
              </div>
            </div>
            <div className="lg:col-span-3">
              {headlineChart === "destinations" && q23c && <DestinationChart question={q23c} />}
              {headlineChart === "los" && q22a1 && <LengthOfStayChart question={q22a1} />}
              {!headlineChart && (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                  No outcome chart available — upload a report with leavers to populate this view.
                </div>
              )}
            </div>
          </div>

          {/* Top Recs + DQ findings */}
          {(topRecs.length > 0 || topFindings.length > 0) && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {topRecs.length > 0 && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <SparkleIcon size={14} className="text-accent" />
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Top recommendations
                    </div>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {topRecs.map((r, i) => (
                      <li key={i} className="text-xs leading-relaxed">
                        <span className="font-semibold text-accent">{r.category}.</span>{" "}
                        <span className="text-foreground">{r.finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {topFindings.length > 0 && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <AlertIcon size={14} className="text-warning" />
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Data quality
                    </div>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {topFindings.map((f, i) => (
                      <li key={i} className="text-xs leading-relaxed">
                        <span
                          className={`mr-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            f.severity === "critical"
                              ? "bg-danger/15 text-danger"
                              : f.severity === "warning"
                              ? "bg-warning/15 text-warning"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="text-foreground">{f.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
