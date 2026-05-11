"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import type { AprQuestion, AprReport } from "@/lib/apr-schema/types";

const groupBySection = (q: AprQuestion | undefined): Record<string, number> => {
  if (!q || q.notApplicable) return {};
  const out: Record<string, number> = {};
  for (const row of q.rows) {
    if (row.isSectionHeader || !row.sectionLabel) continue;
    const totalCell = row.cells.find((c) => c.colLabel.toLowerCase() === "total");
    if (!totalCell || totalCell.value === null || totalCell.value === 0) continue;
    if (row.rowLabel.toLowerCase().startsWith("subtotal")) continue;
    if (row.rowLabel.toLowerCase() === "total") continue;
    out[row.sectionLabel] = (out[row.sectionLabel] ?? 0) + totalCell.value;
  }
  return out;
};

const validation = (report: AprReport, needle: string): number => {
  const q5 = report.questions["Q5a"];
  if (!q5) return 0;
  const row = q5.rows.find(
    (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes(needle.toLowerCase())
  );
  return row?.cells[0]?.value ?? row?.cells[1]?.value ?? 0;
};

export function OutcomeFlow({ report }: { report: AprReport }) {
  const q15 = report.questions["Q15"];
  const q23c = report.questions["Q23c"];

  const entryGroups = groupBySection(q15);
  const exitGroups = groupBySection(q23c);

  const stayers = validation(report, "Number of Stayers");
  const leavers = validation(report, "Number of Leavers");

  const entryNames = Object.keys(entryGroups).filter((k) => entryGroups[k] > 0);
  const exitNames = Object.keys(exitGroups).filter((k) => exitGroups[k] > 0);

  if (entryNames.length === 0 && stayers === 0 && exitNames.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="text-sm font-semibold text-foreground">Outcome flow</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Not enough data in Q15 and Q23c to draw a flow.
        </div>
      </div>
    );
  }

  const nodes: Array<{ name: string }> = [
    ...entryNames.map((n) => ({ name: n })),
    { name: "Total Active" },
    { name: "Still in Program" },
    ...exitNames.map((n) => ({ name: `Exited: ${n}` })),
  ];

  const TOTAL_IDX = entryNames.length;
  const STAYER_IDX = entryNames.length + 1;
  const EXIT_START = entryNames.length + 2;

  const links: Array<{ source: number; target: number; value: number }> = [];

  entryNames.forEach((name, i) => {
    links.push({ source: i, target: TOTAL_IDX, value: entryGroups[name] });
  });

  if (stayers > 0) {
    links.push({ source: TOTAL_IDX, target: STAYER_IDX, value: stayers });
  }

  exitNames.forEach((name, i) => {
    links.push({ source: TOTAL_IDX, target: EXIT_START + i, value: exitGroups[name] });
  });

  if (entryNames.length === 0 && stayers > 0) {
    nodes[TOTAL_IDX] = { name: `Total Active (${stayers + leavers})` };
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">Outcome flow</div>
          <div className="text-xs text-muted-foreground">
            Q15 prior living situation → current status / Q23c exit destination
          </div>
        </div>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
          Flow
        </span>
      </div>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links }}
            nodePadding={24}
            nodeWidth={10}
            margin={{ left: 120, right: 160, top: 10, bottom: 10 }}
            link={{ stroke: "var(--accent)", strokeOpacity: 0.35 } as never}
            node={{ stroke: "var(--accent)" } as never}
          >
            <Tooltip />
          </Sankey>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Note: The APR aggregates entry and exit independently, so flows pass through a shared "Total Active" node rather than tracing individuals.
      </div>
    </div>
  );
}
