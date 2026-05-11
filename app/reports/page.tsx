import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadIcon, HomeIcon } from "@/components/icons";

export default async function ReportsListPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/onboarding");

  const { data: reports } = await supabase
    .from("report_runs")
    .select("id, project_name, hmis_project_type_label, coc_number, report_start_date, report_end_date, total_active_clients, total_active_households, uploaded_at, source_file_name")
    .order("uploaded_at", { ascending: false });

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
          <span className="text-xs text-muted-foreground">/ Reports</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <UploadIcon size={14} />
            Upload new
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Past reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reports?.length ?? 0} report{(reports?.length ?? 0) === 1 ? "" : "s"} uploaded to your organization.
        </p>

        {(!reports || reports.length === 0) && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <HomeIcon size={20} />
            </div>
            <div className="mt-3 text-base font-semibold text-foreground">No reports yet</div>
            <div className="mt-1 text-sm text-muted-foreground">Upload your first APR ZIP to get started.</div>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Upload now
            </Link>
          </div>
        )}

        {reports && reports.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Project</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Period</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Clients</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Households</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Uploaded</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <Link href={`/reports/${r.id}`} className="font-medium text-foreground hover:text-accent">
                        {r.project_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {r.hmis_project_type_label} {r.coc_number ? `· CoC ${r.coc_number}` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.report_start_date} → {r.report_end_date}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{r.total_active_clients}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{r.total_active_households}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(r.uploaded_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/reports/${r.id}`} className="text-xs font-medium text-accent hover:underline">
                        Open →
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
