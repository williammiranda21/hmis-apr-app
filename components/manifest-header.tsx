import Link from "next/link";
import type { AprManifest } from "@/lib/apr-schema/types";
import { formatAprDate } from "@/lib/date-utils";

const formatRange = (start: string, end: string) => {
  if (!start || !end) return "—";
  return `${formatAprDate(start)} → ${formatAprDate(end)}`;
};

export function ManifestHeader({ manifest }: { manifest: AprManifest }) {
  const projectKey = manifest.projectId || manifest.projectName;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Link
            href={`/projects/${encodeURIComponent(projectKey)}/trends`}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent print-hide"
          >
            View trends →
          </Link>
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
