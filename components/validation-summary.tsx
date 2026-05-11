import type { AprQuestion } from "@/lib/apr-schema/types";

export function ValidationSummary({ question }: { question: AprQuestion }) {
  if (question.notApplicable || question.rows.length === 0) return null;

  const rows = question.rows
    .filter((r) => !r.isSectionHeader)
    .map((r) => {
      const label = r.rowLabel.replace(/^\d+\.\s*/, "");
      const value = r.cells[0]?.value ?? null;
      return { label, value };
    });

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Universe at a glance</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Q5a · Report Validations Table — every count used to validate this APR
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((r, i) => (
          <div key={i} className="border-b border-border/60 pb-2">
            <div className="text-xs text-muted-foreground">{r.label}</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
              {r.value === null ? "—" : r.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
