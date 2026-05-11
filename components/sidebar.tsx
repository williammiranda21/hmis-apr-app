"use client";

import { HomeIcon, ShieldIcon, UsersIcon, DollarIcon, ClockIcon, ArrowRightIcon, StarIcon, FlameIcon, SparkleIcon } from "./icons";

export type SidebarSection = {
  key: string;
  label: string;
  count?: number;
};

type Props = {
  sections: SidebarSection[];
  activeKey: string;
  onSelect: (key: string) => void;
  projectName?: string;
  projectType?: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  overview: HomeIcon,
  "data-quality": ShieldIcon,
  demographics: UsersIcon,
  income: DollarIcon,
  "length-of-stay": ClockIcon,
  outcomes: ArrowRightIcon,
  veterans: StarIcon,
  chronic: FlameIcon,
  youth: SparkleIcon,
};

export function Sidebar({ sections, activeKey, onSelect, projectName, projectType }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <span className="text-sm font-bold">A</span>
        </div>
        <div className="text-base font-semibold text-sidebar-foreground">APR Insight</div>
      </div>

      {projectName && (
        <div className="border-b border-sidebar-border px-6 py-4">
          <div className="text-xs uppercase tracking-wider text-sidebar-muted">Current report</div>
          <div className="mt-1 line-clamp-2 text-sm font-medium text-sidebar-foreground">{projectName}</div>
          {projectType && <div className="mt-1 text-xs text-sidebar-muted">{projectType}</div>}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-xs uppercase tracking-wider text-sidebar-muted">Sections</div>
        <ul className="space-y-1">
          {sections.map((s) => {
            const Icon = ICONS[s.key] ?? HomeIcon;
            const active = s.key === activeKey;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => onSelect(s.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-active text-sidebar-active-foreground"
                      : "text-sidebar-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} className={active ? "" : "text-sidebar-muted"} />
                    {s.label}
                  </span>
                  {s.count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs ${
                        active ? "bg-accent/20 text-sidebar-active-foreground" : "bg-muted text-sidebar-muted"
                      }`}
                    >
                      {s.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-muted">
        v1 · local mode
      </div>
    </aside>
  );
}
