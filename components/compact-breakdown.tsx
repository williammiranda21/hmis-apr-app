import type { AprQuestion } from "@/lib/apr-schema/types";

type Row = { label: string; value: number };

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const CompactBreakdownCard = ({
  title,
  subtitle,
  rows,
  totalLabel,
  maxRows = 5,
}: {
  title: string;
  subtitle?: string;
  rows: Row[];
  totalLabel?: string;
  maxRows?: number;
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="mt-3 text-xs italic text-muted-foreground">No data available.</div>
      </div>
    );
  }

  const filtered = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const total = filtered.reduce((sum, r) => sum + r.value, 0);
  const top = filtered.slice(0, maxRows);
  const others = filtered.slice(maxRows);
  if (others.length > 0) {
    const otherTotal = others.reduce((sum, r) => sum + r.value, 0);
    top.push({ label: `Other (${others.length})`, value: otherTotal });
  }
  const max = Math.max(...top.map((r) => r.value), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
        {totalLabel && <div className="text-[10px] text-muted-foreground">{totalLabel}</div>}
      </div>
      {subtitle && <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>}
      <ul className="mt-3 space-y-2">
        {top.map((r, i) => {
          const pct = total > 0 ? (r.value / total) * 100 : 0;
          const width = (r.value / max) * 100;
          return (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{r.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {r.value.toLocaleString()} · {pct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${width}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const rowsTotalCol = (q: AprQuestion | undefined, colName = "total"): Row[] => {
  if (!q || q.notApplicable) return [];
  return q.rows
    .filter((r) => !r.isSectionHeader && r.rowLabel.toLowerCase() !== "total")
    .map((r) => {
      const total = r.cells.find((c) => c.colLabel.toLowerCase() === colName);
      return { label: r.rowLabel, value: total?.value ?? r.cells[0]?.value ?? 0 };
    });
};

export function RaceBreakdown({ question }: { question: AprQuestion }) {
  const rows = rowsTotalCol(question)
    .filter((r) => !r.label.toLowerCase().includes("data not collected"))
    .filter((r) => !r.label.toLowerCase().includes("doesn"))
    .map((r) => {
      // Compress long multiracial combos to a single bucket label
      if (r.label.toLowerCase().startsWith("multiracial")) return { label: "Multiracial", value: r.value };
      return r;
    })
    // Combine the two "Multiracial" rows if both exist
    .reduce<Row[]>((acc, r) => {
      const existing = acc.find((x) => x.label === r.label);
      if (existing) existing.value += r.value;
      else acc.push(r);
      return acc;
    }, []);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <CompactBreakdownCard
      title="Race & Ethnicity"
      rows={rows}
      totalLabel={total > 0 ? `${total.toLocaleString()} clients` : undefined}
    />
  );
}

export function HouseholdBreakdown({ question }: { question: AprQuestion }) {
  const totalRow = question.rows.find((r) => !r.isSectionHeader && r.rowLabel.toLowerCase() === "total");
  if (!totalRow) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Households</div>
        <div className="mt-3 text-xs italic text-muted-foreground">No total row found.</div>
      </div>
    );
  }
  const rows: Row[] = totalRow.cells
    .filter((c) => c.colLabel.toLowerCase() !== "total" && (c.value ?? 0) > 0)
    .map((c) => ({ label: c.colLabel, value: c.value ?? 0 }));
  const total = totalRow.cells.find((c) => c.colLabel.toLowerCase() === "total")?.value ?? 0;
  return (
    <CompactBreakdownCard
      title="Household Composition"
      rows={rows}
      totalLabel={total > 0 ? `${total.toLocaleString()} clients` : undefined}
    />
  );
}

export function LengthOfStayBreakdown({ question }: { question: AprQuestion }) {
  const rows = rowsTotalCol(question);
  return (
    <CompactBreakdownCard
      title="Length of Stay"
      subtitle="Stayers + leavers, by duration band"
      rows={rows}
    />
  );
}

export function PriorSituationBreakdown({ question }: { question: AprQuestion }) {
  // Q15 has section headers (Homeless, Institutional, Temporary, Permanent, Other).
  // For a compact card we sum totals within each section so the 5 buckets
  // tell the "where clients came from" story without the long detail list.
  const sections: Record<string, number> = {};
  for (const row of question.rows) {
    if (row.isSectionHeader || !row.sectionLabel) continue;
    const lc = row.rowLabel.toLowerCase();
    if (lc.startsWith("subtotal") || lc === "total") continue;
    const total = row.cells.find((c) => c.colLabel.toLowerCase() === "total");
    if (!total || total.value === null || total.value === 0) continue;
    const key = row.sectionLabel.replace(/\s+Situations?$/i, "");
    sections[key] = (sections[key] ?? 0) + total.value;
  }
  const rows: Row[] = Object.entries(sections).map(([label, value]) => ({ label, value }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <CompactBreakdownCard
      title="Prior Living Situation"
      subtitle="Where clients came from before this program"
      rows={rows}
      totalLabel={total > 0 ? `${total.toLocaleString()} clients` : undefined}
    />
  );
}

export function AgeBreakdown({ question }: { question: AprQuestion }) {
  const rows = rowsTotalCol(question).filter(
    (r) => !r.label.toLowerCase().includes("data not collected") && !r.label.toLowerCase().includes("doesn")
  );
  return <CompactBreakdownCard title="Age Distribution" rows={rows} />;
}
