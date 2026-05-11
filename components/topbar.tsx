"use client";

import { ThemeToggle } from "./theme-toggle";
import { UploadIcon } from "./icons";

type Props = {
  title: string;
  subtitle?: string;
  onUploadNew?: () => void;
};

export function Topbar({ title, subtitle, onUploadNew }: Props) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-foreground">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
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
