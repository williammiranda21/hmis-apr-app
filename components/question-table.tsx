import type { AprQuestion } from "@/lib/apr-schema/types";

const formatCell = (value: number | null, type: string): string => {
  if (value === null || value === undefined) return "—";
  if (type === "percent") return `${value.toFixed(1)}%`;
  if (type === "currency") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (type === "average") return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return value.toLocaleString();
};

export function QuestionTable({ question }: { question: AprQuestion }) {
  if (question.notApplicable) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">
            <span className="text-muted-foreground">{question.questionId}</span> · {question.title}
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">N/A</span>
        </div>
        <div className="mt-1 text-sm italic text-muted-foreground">Not applicable to this project type.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
        <div className="text-sm font-semibold text-foreground">
          <span className="font-mono text-xs text-muted-foreground">{question.questionId}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          {question.title}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"></th>
              {question.columns.map((col, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {question.rows.map((row, i) =>
              row.isSectionHeader ? (
                <tr key={i} className="bg-muted/30">
                  <td
                    colSpan={question.columns.length + 1}
                    className="px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {row.rowLabel}
                  </td>
                </tr>
              ) : (
                <tr key={i} className="transition-colors hover:bg-muted/20">
                  <td className="px-5 py-2.5 text-foreground">{row.rowLabel}</td>
                  {row.cells.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        cell.value === 0 || cell.value === null
                          ? "text-muted-foreground/60"
                          : "text-foreground"
                      }`}
                    >
                      {formatCell(cell.value, cell.valueType)}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
