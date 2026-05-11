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
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badge?: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-4 flex items-start justify-between gap-2">
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
    <div className="h-72">{children}</div>
  </div>
);

const totalsByRow = (q: AprQuestion, totalColLabel = "Total") => {
  const totalIdx = q.columns.findIndex((c) => c.toLowerCase() === totalColLabel.toLowerCase());
  return q.rows
    .filter((r) => !r.isSectionHeader)
    .map((r) => ({
      label: r.rowLabel,
      value: totalIdx >= 0 ? r.cells[totalIdx]?.value ?? 0 : r.cells[0]?.value ?? 0,
    }))
    .filter((d) => d.value !== null && d.value > 0 && d.label.toLowerCase() !== "total");
};

export function RaceEthnicityChart({ question }: { question: AprQuestion }) {
  const data = totalsByRow(question).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  if (data.length === 0) return null;
  return (
    <ChartCard
      title="Race and Ethnicity"
      subtitle={`${question.questionId} · Distribution of active persons`}
      badge="Demographics"
    >
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

export function LengthOfStayChart({ question }: { question: AprQuestion }) {
  const data = question.rows
    .filter((r) => !r.isSectionHeader && r.rowLabel.toLowerCase() !== "total")
    .map((r) => {
      const leavers = r.cells.find((c) => c.colLabel.toLowerCase() === "leavers");
      const stayers = r.cells.find((c) => c.colLabel.toLowerCase() === "stayers");
      return {
        label: r.rowLabel,
        Leavers: leavers?.value ?? 0,
        Stayers: stayers?.value ?? 0,
      };
    });

  return (
    <ChartCard
      title="Length of Stay"
      subtitle={`${question.questionId} · Stayers vs. leavers by duration band`}
      badge="Retention"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={70}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          <Bar dataKey="Stayers" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Leavers" stackId="a" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DestinationChart({ question }: { question: AprQuestion }) {
  const sections: Record<string, number> = {};
  for (const row of question.rows) {
    if (row.isSectionHeader) continue;
    if (!row.sectionLabel) continue;
    const total = row.cells.find((c) => c.colLabel.toLowerCase() === "total");
    if (!total || total.value === null) continue;
    if (row.rowLabel.toLowerCase().startsWith("subtotal")) continue;
    sections[row.sectionLabel] = (sections[row.sectionLabel] ?? 0) + total.value;
  }
  const data = Object.entries(sections)
    .map(([label, value]) => ({ label, value }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <ChartCard
        title="Exit Destinations"
        subtitle={`${question.questionId} · By destination category`}
        badge="Outcomes"
      >
        <div className="flex h-full flex-col items-center justify-center gap-1 text-sm">
          <div className="text-muted-foreground">No exits recorded</div>
          <div className="text-xs text-muted-foreground/70">All clients are stayers in this period.</div>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Exit Destinations by Category"
      subtitle={`${question.questionId} · Aggregated by destination type`}
      badge="Outcomes"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 100, right: 16, top: 8, bottom: 8 }}>
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
          <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HouseholdCompositionChart({ question }: { question: AprQuestion }) {
  const totalRow = question.rows.find((r) => !r.isSectionHeader && r.rowLabel.toLowerCase() === "total");
  if (!totalRow) return null;
  const data = totalRow.cells
    .filter((c) => c.colLabel.toLowerCase() !== "total" && (c.value ?? 0) > 0)
    .map((c) => ({ label: c.colLabel, value: c.value ?? 0 }));
  if (data.length === 0) return null;
  return (
    <ChartCard
      title="Household Composition"
      subtitle={`${question.questionId} · From the totals row`}
      badge="Households"
    >
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
