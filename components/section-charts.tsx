"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AprQuestion } from "@/lib/apr-schema/types";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const ChartCard = ({
  title,
  subtitle,
  badge,
  height = 320,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  height?: number;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {badge && (
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
          {badge}
        </span>
      )}
    </div>
    <div style={{ height }}>{children}</div>
  </div>
);

const HorizontalBars = ({
  data,
  fillVar = "var(--chart-1)",
}: {
  data: Array<{ label: string; value: number }>;
  fillVar?: string;
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 140, right: 24, top: 8, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
      <XAxis
        type="number"
        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        type="category"
        dataKey="label"
        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        width={150}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip cursor={{ fill: "var(--muted)" }} />
      <Bar dataKey="value" fill={fillVar} radius={[0, 6, 6, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const rowsTotal = (q: AprQuestion | undefined, totalCol = "total") => {
  if (!q || q.notApplicable) return [];
  return q.rows
    .filter((r) => !r.isSectionHeader && r.rowLabel.toLowerCase() !== "total")
    .map((r) => {
      const tc = r.cells.find((c) => c.colLabel.toLowerCase() === totalCol);
      const cellVal = tc?.value ?? r.cells[0]?.value ?? 0;
      return { label: r.rowLabel, value: cellVal ?? 0 };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
};

export function AgeChart({ question }: { question: AprQuestion }) {
  const data = rowsTotal(question);
  if (data.length === 0) return null;
  return (
    <ChartCard title="Age distribution" subtitle="Q11 · Active persons by age band" badge="Demographics">
      <HorizontalBars data={data} fillVar="var(--chart-2)" />
    </ChartCard>
  );
}

export function PriorSituationChart({ question }: { question: AprQuestion }) {
  if (!question || question.notApplicable) return null;
  const sections: Record<string, number> = {};
  for (const row of question.rows) {
    if (row.isSectionHeader || !row.sectionLabel) continue;
    const tc = row.cells.find((c) => c.colLabel.toLowerCase() === "total");
    if (!tc || tc.value === null || tc.value === 0) continue;
    if (row.rowLabel.toLowerCase().startsWith("subtotal")) continue;
    if (row.rowLabel.toLowerCase() === "total") continue;
    sections[row.sectionLabel] = (sections[row.sectionLabel] ?? 0) + tc.value;
  }
  const data = Object.entries(sections)
    .map(([label, value]) => ({ label, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  if (data.length === 0) return null;
  return (
    <ChartCard
      title="Where clients came from"
      subtitle="Q15 · Prior living situation, aggregated by category"
      badge="Demographics"
    >
      <HorizontalBars data={data} fillVar="var(--chart-3)" />
    </ChartCard>
  );
}

export function IncomeRangesChart({ question }: { question: AprQuestion }) {
  const data = rowsTotal(question);
  if (data.length === 0) return null;
  return (
    <ChartCard title="Income ranges" subtitle="Q17 · Distribution of monthly income amounts" badge="Income">
      <HorizontalBars data={data} fillVar="var(--chart-4)" />
    </ChartCard>
  );
}

export function HealthInsuranceChart({ question }: { question: AprQuestion }) {
  const totalRow = question.rows.find(
    (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes("at start")
  );
  if (!totalRow) return null;
  const data = totalRow.cells
    .filter((c) => c.value !== null && c.value > 0)
    .map((c) => ({ label: c.colLabel, value: c.value as number }));
  if (data.length === 0) return null;
  return (
    <ChartCard title="Health insurance coverage" subtitle="Q21 · At project start" badge="Income">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="40%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: 11, maxWidth: 180 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

const findRow = (q: AprQuestion, needle: string) =>
  q.rows.find(
    (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes(needle.toLowerCase())
  );

export function ExitToPHCallout({
  question,
  totalLeavers,
}: {
  question: AprQuestion;
  totalLeavers: number;
}) {
  const positiveRow = findRow(question, "exiting to positive housing destinations");
  const excludedRow = findRow(question, "destinations that excluded them");

  const positiveTotal = positiveRow?.cells.find((c) => c.colLabel.toLowerCase() === "total")?.value ?? 0;
  const excludedTotal = excludedRow?.cells.find((c) => c.colLabel.toLowerCase() === "total")?.value ?? 0;
  const denominator = Math.max(0, totalLeavers - excludedTotal);
  const pct = denominator > 0 ? (positiveTotal / denominator) * 100 : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        Exits to permanent housing
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums text-foreground">
          {pct !== null ? `${pct.toFixed(0)}%` : "—"}
        </span>
        <span className="text-sm text-muted-foreground">
          {positiveTotal.toLocaleString()} of {denominator.toLocaleString()} leavers
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: pct !== null ? `${Math.min(100, pct)}%` : "0%" }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Positive PH exits</div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {positiveTotal.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Excluded</div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {excludedTotal.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Total leavers</div>
          <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {totalLeavers.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        HUD excludes Deceased, Data Not Collected, Client Doesn&apos;t Know/Refused, and No Exit Interview
        from the denominator.
      </div>
    </div>
  );
}
