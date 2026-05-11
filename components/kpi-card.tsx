import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
};

export function KpiCard({ label, value, hint, icon, accent }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
        accent
          ? "border-accent/30 bg-accent/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
