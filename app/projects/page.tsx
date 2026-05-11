import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadReport } from "@/lib/supabase/persist";
import { extractMetrics, type StandardMetrics } from "@/lib/apr-metrics";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadIcon } from "@/components/icons";

type ReportRunRow = {
  id: string;
  project_id: string | null;
  project_name: string;
  hmis_project_type_label: string | null;
  coc_number: string | null;
  total_active_clients: number | null;
  total_active_households: number | null;
  report_start_date: string | null;
  report_end_date: string | null;
  uploaded_at: string;
};

type ProjectRow = ReportRunRow & {
  reportCount: number;
  metrics: StandardMetrics | null;
};

const formatNum = (n: number | null) => (n === null ? "—" : n.toLocaleString());
const formatPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(0)}%`);

export default async function ProjectsPage() {
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
    .select("id, project_id, project_name, hmis_project_type_label, coc_number, total_active_clients, total_active_households, report_start_date, report_end_date, uploaded_at")
    .order("uploaded_at", { ascending: false });

  const projectsMap = new Map<string, { latest: ReportRunRow; count: number }>();
  for (const r of (reports ?? []) as ReportRunRow[]) {
    const key = r.project_id ?? r.project_name;
    const existing = projectsMap.get(key);
    if (!existing) {
      projectsMap.set(key, { latest: r, count: 1 });
    } else {
      existing.count += 1;
    }
  }

  const projects: ProjectRow[] = await Promise.all(
    Array.from(projectsMap.values()).map(async ({ latest, count }) => {
      try {
        const loaded = await loadReport(supabase, latest.id);
        const metrics = loaded ? extractMetrics(loaded) : null;
        return { ...latest, reportCount: count, metrics };
      } catch {
        return { ...latest, reportCount: count, metrics: null };
      }
    })
  );

  projects.sort((a, b) => a.project_name.localeCompare(b.project_name));

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
          <span className="text-xs text-muted-foreground">/ Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            All reports
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <UploadIcon size={14} />
            Upload
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
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <span className="text-xs text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"} · cross-project comparison from latest report
          </span>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Side-by-side view of every project in your organization, using the most recent APR upload for each. Click a row to see trends over time.
        </p>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="text-base font-semibold text-foreground">No projects yet</div>
            <div className="mt-1 text-sm text-muted-foreground">Upload your first APR to see it here.</div>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Upload now
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Project</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Clients</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Households</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Stayers</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Leavers</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">% to PH</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Veterans</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Chronic</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Reports</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <Link
                        href={`/projects/${encodeURIComponent(p.project_id ?? p.project_name)}/trends`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {p.project_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {p.hmis_project_type_label} {p.coc_number ? `· CoC ${p.coc_number}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNum(p.metrics?.activeClients ?? p.total_active_clients ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNum(p.metrics?.activeHouseholds ?? p.total_active_households ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNum(p.metrics?.stayers ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNum(p.metrics?.leavers ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatPct(p.metrics?.pctToPermanentHousing ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNum(p.metrics?.veterans ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatNum(p.metrics?.chronicallyHomeless ?? null)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{p.reportCount}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/reports/${p.id}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Latest →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
