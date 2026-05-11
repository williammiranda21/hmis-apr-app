"use client";

import { ThemeToggle } from "./theme-toggle";
import { UploadIcon } from "./icons";

type Props = {
  title: string;
  subtitle?: string;
  onUploadNew?: () => void;
  showPrint?: boolean;
  summaryHref?: string;
};

export function Topbar({ title, subtitle, onUploadNew, showPrint, summaryHref }: Props) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur print-hide">
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-foreground">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        {summaryHref && (
          <a
            href={summaryHref}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            title="One-page summary for board / funders"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
            Board summary
          </a>
        )}
        {showPrint && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            title="Print or export to PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF
          </button>
        )}
        {onUploadNew && (
          <button
            type="button"
            onClick={onUploadNew}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <UploadIcon size={14} />
            New report
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
