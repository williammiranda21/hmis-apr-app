import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadReport } from "@/lib/supabase/persist";
import { extractMetrics } from "@/lib/apr-metrics";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrendsChart, type TrendDatum } from "@/components/trends-chart";
import { KpiCard } from "@/components/kpi-card";
import { UsersIcon, HomeIcon, CheckCircleIcon, ShieldIcon } from "@/components/icons";

import { formatAprDate } from "@/lib/date-utils";

const fmtPeriod = (start: string | null, end: string | null) => {
  if (!start || !end) return "—";
  return `${formatAprDate(start, { month: "short", day: "numeric" })} – ${formatAprDate(end, { month: "short", day: "numeric", year: "2-digit" })}`;
};

export default async function ProjectTrendsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectKey = decodeURIComponent(id);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) redirect("/onboarding");

  const { data: reports } = await supabase
    .from("report_runs")
    .select("id, project_id, project_name, hmis_project_type_label, coc_number, report_start_date, report_end_date, uploaded_at")
    .or(`project_id.eq.${projectKey},project_name.eq.${projectKey}`)
    .order("report_start_date", { ascending: true });

  if (!reports || reports.length === 0) notFound();

  const projectName = reports[0].project_name;
  const projectType = reports[0].hmis_project_type_label;
  const cocNumber = reports[0].coc_number;

  const enriched = await Promise.all(
    reports.map(async (r) => {
      try {
        const loaded = await loadReport(supabase, r.id);
        const metrics = loaded ? extractMetrics(loaded) : null;
        return { report: r, metrics };
      } catch {
        return { report: r, metrics: null };
      }
    })
  );

  const trendData: TrendDatum[] = enriched.map(({ report, metrics }) => ({
    period: fmtPeriod(report.report_start_date, report.report_end_date),
    reportId: report.id,
    "Active Clients": metrics?.activeClients ?? null,
    "Households": metrics?.activeHouseholds ?? null,
    "Stayers": metrics?.stayers ?? null,
    "Leavers": metrics?.leavers ?? null,
    "Veterans": metrics?.veterans ?? null,
    "Chronically Homeless": metrics?.chronicallyHomeless ?? null,
    "% to Permanent Housing": metrics?.pctToPermanentHousing ?? null,
  }));

  const latest = enriched[enriched.length - 1].metrics;

  return (
    <main className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
            <div className="text-base font-semibold text-foreground">APR Insight</div>
          </Link>
          <span className="text-xs text-muted-foreground">
            / <Link href="/projects" className="hover:text-foreground">Projects</Link> / {projectName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/${enriched[enriched.length - 1].report.id}`}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Latest report →
          </Link>
          <ThemeToggle />
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{projectName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {projectType} {cocNumber ? `· CoC ${cocNumber}` : ""} · {enriched.length} report{enriched.length === 1 ? "" : "s"}
        </p>

        {enriched.length < 2 && (
          <div className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
            Only one report uploaded for this project so far. Trend lines need at least two reports — upload another APR to see how this program is moving over time.
          </div>
        )}

        <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Active Clients (latest)" value={latest?.activeClients?.toLocaleString() ?? "—"} icon={<UsersIcon size={16} />} accent />
          <KpiCard label="Households (latest)" value={latest?.activeHouseholds?.toLocaleString() ?? "—"} icon={<HomeIcon size={16} />} />
          <KpiCard label="Stayers (latest)" value={latest?.stayers?.toLocaleString() ?? "—"} icon={<CheckCircleIcon size={16} />} />
          <KpiCard label="% to PH (latest)" value={latest?.pctToPermanentHousing !== null && latest?.pctToPermanentHousing !== undefined ? `${latest.pctToPermanentHousing.toFixed(0)}%` : "—"} icon={<ShieldIcon size={16} />} />
        </section>

        <section className="mt-6 space-y-6">
          <TrendsChart
            title="Population over time"
            subtitle="Active clients and households across reporting periods"
            data={trendData}
            series={[
              { key: "Active Clients", label: "Active Clients", color: "var(--chart-1)" },
              { key: "Households", label: "Households", color: "var(--chart-2)" },
            ]}
          />

          <TrendsChart
            title="Stayers vs. Leavers"
            subtitle="Retention and exit volume across reporting periods"
            data={trendData}
            series={[
              { key: "Stayers", label: "Stayers", color: "var(--chart-1)" },
              { key: "Leavers", label: "Leavers", color: "var(--chart-3)" },
            ]}
          />

          <TrendsChart
            title="% to Permanent Housing"
            subtitle="HUD's headline outcome metric (Q23c)"
            data={trendData}
            series={[
              { key: "% to Permanent Housing", label: "% to PH", color: "var(--chart-1)" },
            ]}
            yLabel="%"
            isPercent
          />

          <TrendsChart
            title="Population subgroups"
            subtitle="Veterans and chronically-homeless counts"
            data={trendData}
            series={[
              { key: "Veterans", label: "Veterans", color: "var(--chart-4)" },
              { key: "Chronically Homeless", label: "Chronically Homeless", color: "var(--chart-5)" },
            ]}
          />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-foreground">All reports for this project</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Period</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Clients</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Stayers</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Leavers</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">% to PH</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Uploaded</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enriched.map(({ report, metrics }) => (
                  <tr key={report.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-3 font-medium text-foreground">{fmtPeriod(report.report_start_date, report.report_end_date)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{metrics?.activeClients?.toLocaleString() ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{metrics?.stayers?.toLocaleString() ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{metrics?.leavers?.toLocaleString() ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{metrics?.pctToPermanentHousing !== null && metrics?.pctToPermanentHousing !== undefined ? `${metrics.pctToPermanentHousing.toFixed(0)}%` : "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(report.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/reports/${report.id}`} className="text-xs font-medium text-accent hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
