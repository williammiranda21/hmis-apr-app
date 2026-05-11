"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AprQuestion, AprReport } from "@/lib/apr-schema/types";

const CATEGORY_COLORS: Array<{ match: string; color: string }> = [
  { match: "permanent", color: "var(--chart-1)" },
  { match: "temporary", color: "var(--chart-2)" },
  { match: "institutional", color: "var(--chart-4)" },
  { match: "homeless", color: "var(--chart-5)" },
  { match: "other", color: "var(--chart-3)" },
];

const colorFor = (label: string): string => {
  const lc = label.toLowerCase();
  for (const c of CATEGORY_COLORS) {
    if (lc.includes(c.match)) return c.color;
  }
  return "var(--chart-3)";
};

const groupBySection = (q: AprQuestion | undefined): Array<{ label: string; value: number }> => {
  if (!q || q.notApplicable) return [];
  const out: Record<string, number> = {};
  for (const row of q.rows) {
    if (row.isSectionHeader || !row.sectionLabel) continue;
    const totalCell = row.cells.find((c) => c.colLabel.toLowerCase() === "total");
    if (!totalCell || totalCell.value === null || totalCell.value === 0) continue;
    if (row.rowLabel.toLowerCase().startsWith("subtotal")) continue;
    if (row.rowLabel.toLowerCase() === "total") continue;
    out[row.sectionLabel] = (out[row.sectionLabel] ?? 0) + totalCell.value;
  }
  return Object.entries(out)
    .map(([label, value]) => ({ label, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
};

const SideCard = ({
  title,
  subtitle,
  data,
  emptyText,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number }>;
  emptyText: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
    </div>
    <div className="h-72">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 120, right: 24, top: 8, bottom: 8 }}>
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
              width={140}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((d) => (
                <Cell key={d.label} fill={colorFor(d.label)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
);

export function EntryVsExitComparison({ report }: { report: AprReport }) {
  const q15 = report.questions["Q15"];
  const q23c = report.questions["Q23c"];

  const entry = groupBySection(q15);
  const exit = groupBySection(q23c);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SideCard
        title="Where clients came from"
        subtitle="Q15 · Prior living situation, grouped by category"
        data={entry}
        emptyText="No prior-situation data."
      />
      <SideCard
        title="Where leavers went"
        subtitle="Q23c · Exit destination, grouped by category"
        data={exit}
        emptyText="No leavers in this reporting period."
      />
    </div>
  );
}
