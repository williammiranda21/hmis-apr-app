"use client";

import { useState } from "react";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";
import { SparkleIcon, CheckCircleIcon, AlertIcon, InfoIcon } from "./icons";

const severityStyles: Record<string, { container: string; badge: string; Icon: React.ComponentType<{ className?: string; size?: number }> }> = {
  critical: {
    container: "border-danger/30 bg-danger/5",
    badge: "bg-danger/15 text-danger",
    Icon: AlertIcon,
  },
  warning: {
    container: "border-warning/30 bg-warning/5",
    badge: "bg-warning/15 text-warning",
    Icon: AlertIcon,
  },
  info: {
    container: "border-border bg-card",
    badge: "bg-muted text-muted-foreground",
    Icon: InfoIcon,
  },
};

type Props = {
  report: AprReport;
  reportRunId?: string;
  initialAnalysis?: AnalysisResult;
};

export function AiInsights({ report, reportRunId, initialAnalysis }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(initialAnalysis ?? null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = reportRunId
        ? { reportRunId }
        : { report };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <SparkleIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">AI Insights</h3>
              <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
                Data-quality findings and actionable performance recommendations grounded in HUD APR semantics.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Analyzing…" : result ? "Re-run analysis" : "Run AI analysis"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <CheckCircleIcon size={14} className="text-accent" />
                Executive summary
              </div>
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {result.executiveSummary}
              </div>
            </div>

            {result.dataQualityFindings.length > 0 && (
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Data quality
                </h4>
                <ul className="space-y-2">
                  {result.dataQualityFindings.map((f, i) => {
                    const style = severityStyles[f.severity] ?? severityStyles.info;
                    const Icon = style.Icon;
                    return (
                      <li key={i} className={`rounded-xl border p-4 ${style.container}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}>
                                {f.severity}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">{f.questionId}</span>
                            </div>
                            <div className="mt-1.5 text-sm text-foreground">{f.message}</div>
                            {f.suggestedAction && (
                              <div className="mt-1.5 text-xs text-muted-foreground">
                                <strong className="text-foreground">Action:</strong> {f.suggestedAction}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Recommendations
                </h4>
                <ul className="space-y-3">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                        {r.category}
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">{r.finding}</div>
                      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>
                          <span className="font-semibold text-foreground">Evidence:</span> {r.evidence}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Action:</span> {r.suggestedAction}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Generated {new Date(result.generatedAt).toLocaleString()} · {result.model}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
