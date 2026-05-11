"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";
import { QUESTION_CATEGORIES } from "@/lib/apr-parser/questions";
import { ManifestHeader } from "./manifest-header";
import { QuestionTable } from "./question-table";
import { AiInsights } from "./ai-insights";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { KpiCard } from "./kpi-card";
import { UsersIcon, HomeIcon, ShieldIcon, StarIcon, FlameIcon, CheckCircleIcon } from "./icons";
import {
  DestinationChart,
  HouseholdCompositionChart,
  LengthOfStayChart,
  RaceEthnicityChart,
} from "./featured-charts";

type Props = {
  report: AprReport;
  reportRunId?: string;
  initialAnalysis?: AnalysisResult;
};

const validationLookup = (report: AprReport, label: string): number | null => {
  const q5 = report.questions["Q5a"];
  if (!q5) return null;
  const row = q5.rows.find((r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes(label.toLowerCase()));
  if (!row) return null;
  return row.cells[0]?.value ?? null;
};

export function Dashboard({ report, reportRunId, initialAnalysis }: Props) {
  const router = useRouter();

  const presentCategories = useMemo(
    () =>
      QUESTION_CATEGORIES.map((cat) => ({
        ...cat,
        presentQuestionIds: cat.questionIds.filter((id) => report.questions[id]),
      })).filter((cat) => cat.presentQuestionIds.length > 0),
    [report]
  );

  const [activeKey, setActiveKey] = useState<string>(presentCategories[0]?.key ?? "overview");

  const current = presentCategories.find((c) => c.key === activeKey) ?? presentCategories[0];

  const q12 = report.questions["Q12"];
  const q22a1 = report.questions["Q22a1"];
  const q23c = report.questions["Q23c"];
  const q7a = report.questions["Q7a"];

  const veterans = validationLookup(report, "Number of Veterans");
  const chronic = validationLookup(report, "Number of Chronically Homeless");
  const stayers = validationLookup(report, "Number of Stayers");
  const leavers = validationLookup(report, "Number of Leavers");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        sections={presentCategories.map((c) => ({
          key: c.key,
          label: c.label,
          count: c.presentQuestionIds.length,
        }))}
        activeKey={activeKey}
        onSelect={setActiveKey}
        projectName={report.manifest.projectName}
        projectType={report.manifest.hmisProjectTypeLabel}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={current?.label ?? "Overview"}
          subtitle={`${report.sourceFileName} · uploaded ${new Date(report.uploadedAt).toLocaleString()}`}
          onUploadNew={() => router.push("/")}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/reports" className="hover:text-foreground">
                ← All reports
              </Link>
            </div>

            <ManifestHeader manifest={report.manifest} />

            {report.warnings.length > 0 && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
                <div className="font-semibold">Parser warnings</div>
                <ul className="mt-1 list-disc pl-5">
                  {report.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                label="Active Clients"
                value={report.manifest.totalActiveClients.toLocaleString()}
                icon={<UsersIcon size={16} />}
                accent
              />
              <KpiCard
                label="Households"
                value={report.manifest.totalActiveHouseholds.toLocaleString()}
                icon={<HomeIcon size={16} />}
              />
              <KpiCard
                label="Stayers"
                value={stayers !== null ? stayers.toLocaleString() : "—"}
                icon={<CheckCircleIcon size={16} />}
              />
              <KpiCard
                label="Leavers"
                value={leavers !== null ? leavers.toLocaleString() : "—"}
                icon={<ShieldIcon size={16} />}
              />
              <KpiCard
                label="Veterans"
                value={veterans !== null ? veterans.toLocaleString() : "—"}
                icon={<StarIcon size={16} />}
              />
              <KpiCard
                label="Chronically Homeless"
                value={chronic !== null ? chronic.toLocaleString() : "—"}
                icon={<FlameIcon size={16} />}
              />
            </section>

            <AiInsights report={report} reportRunId={reportRunId} initialAnalysis={initialAnalysis} />

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-foreground">At a glance</h3>
                <span className="text-xs text-muted-foreground">Selected featured visualizations</span>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {q12 && <RaceEthnicityChart question={q12} />}
                {q22a1 && <LengthOfStayChart question={q22a1} />}
                {q23c && <DestinationChart question={q23c} />}
                {q7a && <HouseholdCompositionChart question={q7a} />}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-base font-semibold text-foreground">{current?.label}</h3>
                <span className="text-xs text-muted-foreground">
                  {current?.presentQuestionIds.length ?? 0} {current?.presentQuestionIds.length === 1 ? "question" : "questions"}
                </span>
              </div>
              <div className="space-y-4">
                {current?.presentQuestionIds.map((id) => (
                  <QuestionTable key={id} question={report.questions[id]} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
