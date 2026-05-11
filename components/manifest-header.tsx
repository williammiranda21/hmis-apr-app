import type { AprManifest } from "@/lib/apr-schema/types";

const formatDate = (s: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatRange = (start: string, end: string) => {
  if (!start || !end) return "—";
  return `${formatDate(start)} → ${formatDate(end)}`;
};

export function ManifestHeader({ manifest }: { manifest: AprManifest }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
            {manifest.hmisProjectTypeLabel}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            CoC {manifest.cocNumber}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Project {manifest.projectId}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {manifest.projectName}
        </h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {manifest.organizationName} · {manifest.hmisSoftwareNameAndVersion}
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Reporting period {formatRange(manifest.reportStartDate, manifest.reportEndDate)}
        </div>
      </div>
    </section>
  );
}
