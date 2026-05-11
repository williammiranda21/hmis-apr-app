import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { UploadZone } from "@/components/upload-zone";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatAprDate } from "@/lib/date-utils";

export default async function Home() {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .single();

  const { data: recent } = await supabase
    .from("report_runs")
    .select("id, project_name, hmis_project_type_label, report_start_date, report_end_date, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(5);

  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
            <div className="text-base font-semibold text-foreground">APR Insight</div>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">{org?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Projects
          </Link>
          <Link
            href="/reports"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Past reports
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

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mb-10 max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            APR analysis, <span className="text-accent">simplified</span>.
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Drop your HMIS APR export to see your data come alive — visualized, validated, and explained by AI.
          </p>
        </div>

        <UploadZone />

        {recent && recent.length > 0 && (
          <div className="mt-12 w-full max-w-3xl">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recent reports
              </h3>
              <Link href="/reports" className="text-xs font-medium text-accent hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-accent/40"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{r.project_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.hmis_project_type_label} · {formatAprDate(r.report_start_date)} → {formatAprDate(r.report_end_date)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.uploaded_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
