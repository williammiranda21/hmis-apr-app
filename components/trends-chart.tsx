"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLES } from "./featured-charts";

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
};

export type TrendDatum = {
  period: string;
  [metric: string]: number | string | null;
};

export function TrendsChart({
  title,
  subtitle,
  data,
  series,
  yLabel,
  isPercent = false,
}: {
  title: string;
  subtitle?: string;
  data: TrendDatum[];
  series: TrendSeries[];
  yLabel?: string;
  isPercent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              label={
                yLabel
                  ? { value: yLabel, angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "var(--muted-foreground)" } }
                  : undefined
              }
              tickFormatter={isPercent ? (v) => `${v}%` : undefined}
            />
            <Tooltip
              {...TOOLTIP_STYLES}
              formatter={
                isPercent
                  ? (v) => (typeof v === "number" ? `${v.toFixed(1)}%` : String(v))
                  : undefined
              }
              cursor={{ stroke: "var(--border)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
