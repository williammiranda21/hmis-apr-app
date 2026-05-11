import type { AprQuestion, AprReport } from "@/lib/apr-schema/types";
import { CheckCircleIcon, AlertIcon, InfoIcon } from "./icons";

const ELEMENTS: Array<{ id: string; label: string; subtitle: string }> = [
  { id: "Q6a", label: "PII", subtitle: "Personally Identifiable Information" },
  { id: "Q6b", label: "Universal Data Elements", subtitle: "Core required fields" },
  { id: "Q6c", label: "Income & Housing", subtitle: "Income and prior living situation" },
  { id: "Q6d", label: "Chronic Homelessness", subtitle: "Required for CH determination" },
  { id: "Q6e", label: "Timeliness", subtitle: "Records entered within 3 days" },
  { id: "Q6f", label: "Inactive Records", subtitle: "SO & ES NbN inactive client records" },
];

const findIssueRate = (q: AprQuestion | undefined): { rate: number | null; issues: number | null; total: number | null } => {
  if (!q || q.notApplicable) return { rate: null, issues: null, total: null };
  const overallRow = q.rows.find(
    (r) =>
      !r.isSectionHeader &&
      (r.rowLabel.toLowerCase().includes("overall") || r.rowLabel.toLowerCase().includes("total"))
  );
  if (!overallRow) return { rate: null, issues: null, total: null };
  const rateCell = overallRow.cells.find(
    (c) => c.colLabel.toLowerCase().includes("% of") || c.colLabel.toLowerCase().includes("issue rate")
  );
  const totalCell = overallRow.cells.find((c) => c.colLabel.toLowerCase() === "total");
  const issuesCell = overallRow.cells.find((c) => c.colLabel.toLowerCase().includes("issue"));
  return {
    rate: rateCell?.value ?? null,
    issues: issuesCell?.value ?? null,
    total: totalCell?.value ?? null,
  };
};

const statusFor = (rate: number | null) => {
  if (rate === null) return { tone: "muted" as const, label: "No data", Icon: InfoIcon };
  if (rate <= 5) return { tone: "success" as const, label: "Excellent", Icon: CheckCircleIcon };
  if (rate <= 10) return { tone: "warning" as const, label: "Acceptable", Icon: InfoIcon };
  return { tone: "danger" as const, label: "Needs attention", Icon: AlertIcon };
};

const toneClasses: Record<string, { border: string; bg: string; badge: string; bar: string }> = {
  success: {
    border: "border-success/30",
    bg: "bg-success/5",
    badge: "bg-success/15 text-success",
    bar: "bg-success",
  },
  warning: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    badge: "bg-warning/15 text-warning",
    bar: "bg-warning",
  },
  danger: {
    border: "border-danger/30",
    bg: "bg-danger/5",
    badge: "bg-danger/15 text-danger",
    bar: "bg-danger",
  },
  muted: {
    border: "border-border",
    bg: "bg-card",
    badge: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground/40",
  },
};

export function DataQualityScorecard({ report }: { report: AprReport }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-foreground">Data quality scorecard</h3>
        <span className="text-xs text-muted-foreground">Q6a–f · overall issue rate per element</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ELEMENTS.map((el) => {
          const q = report.questions[el.id];
          const { rate, issues, total } = findIssueRate(q);
          const status = statusFor(rate);
          const Icon = status.Icon;
          const t = toneClasses[status.tone];
          const display = rate !== null ? `${rate.toFixed(1)}%` : "—";
          const barWidth = rate !== null ? Math.min(100, Math.max(2, rate)) : 0;

          return (
            <div key={el.id} className={`rounded-2xl border p-5 ${t.border} ${t.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{el.id}</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{el.label}</div>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.badge}`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{display}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${t.badge}`}>
                  {status.label}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {issues !== null && total !== null
                  ? `${issues.toLocaleString()} of ${total.toLocaleString()} flagged`
                  : el.subtitle}
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${t.bar} transition-all`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
