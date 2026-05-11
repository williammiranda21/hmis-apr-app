"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ValidationSummary } from "./validation-summary";
import { AiFollowup } from "./ai-followup";
import { UsersIcon, HomeIcon, ShieldIcon, StarIcon, FlameIcon, CheckCircleIcon } from "./icons";
import {
  DestinationChart,
  DestinationDetailChart,
  HouseholdCompositionChart,
  LengthOfStayChart,
  RaceEthnicityChart,
} from "./featured-charts";
import { DataQualityScorecard } from "./data-quality-scorecard";
import { EntryVsExitComparison } from "./outcome-flow";
import {
  AgeChart,
  ExitToPHCallout,
  HealthInsuranceChart,
  IncomeRangesChart,
  PriorSituationChart,
} from "./section-charts";

type Props = {
  report: AprReport;
  reportRunId?: string;
  initialAnalysis?: AnalysisResult;
};

const validationLookup = (report: AprReport, needle: string): number | null => {
  const q5 = report.questions["Q5a"];
  if (!q5) return null;
  const lc = needle.toLowerCase();
  const row = q5.rows.find(
    (r) => !r.isSectionHeader && r.rowLabel.toLowerCase().includes(lc)
  );
  if (!row) return null;
  return row.cells[0]?.value ?? row.cells[1]?.value ?? null;
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

  const mainRef = useRef<HTMLElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (mainRef.current && sectionRef.current) {
      const offsetTop = sectionRef.current.offsetTop - 16;
      mainRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  }, [activeKey]);

  const q5a = report.questions["Q5a"];
  const q7a = report.questions["Q7a"];
  const q11 = report.questions["Q11"];
  const q12 = report.questions["Q12"];
  const q15 = report.questions["Q15"];
  const q17 = report.questions["Q17"];
  const q21 = report.questions["Q21"];
  const q22a1 = report.questions["Q22a1"];
  const q23c = report.questions["Q23c"];

  const veterans = validationLookup(report, "Number of Veterans");
  const chronic = validationLookup(report, "Number of Chronically Homeless");
  const stayers = validationLookup(report, "Number of Stayers");
  const leavers = validationLookup(report, "Number of Leavers");

  const sectionCharts = useMemo(() => {
    const charts: React.ReactNode[] = [];
    switch (activeKey) {
      case "overview":
        if (q7a) charts.push(<HouseholdCompositionChart key="q7a" question={q7a} />);
        if (q12) charts.push(<RaceEthnicityChart key="q12" question={q12} />);
        if (q22a1) charts.push(<LengthOfStayChart key="q22a1" question={q22a1} />);
        if (q23c) charts.push(<DestinationChart key="q23c" question={q23c} />);
        break;
      case "demographics":
        if (q12) charts.push(<RaceEthnicityChart key="q12" question={q12} />);
        if (q7a) charts.push(<HouseholdCompositionChart key="q7a" question={q7a} />);
        if (q11) charts.push(<AgeChart key="q11" question={q11} />);
        if (q15) charts.push(<PriorSituationChart key="q15" question={q15} />);
        break;
      case "income":
        if (q17) charts.push(<IncomeRangesChart key="q17" question={q17} />);
        if (q21) charts.push(<HealthInsuranceChart key="q21" question={q21} />);
        break;
      case "length-of-stay":
        if (q22a1) charts.push(<LengthOfStayChart key="q22a1" question={q22a1} />);
        break;
      case "outcomes":
        if (q23c) charts.push(<DestinationDetailChart key="q23c-detail" question={q23c} />);
        break;
    }
    return charts;
  }, [activeKey, q7a, q11, q12, q15, q17, q21, q22a1, q23c]);

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
          showPrint
          summaryHref={reportRunId ? `/reports/${reportRunId}/summary` : undefined}
        />

        <main ref={mainRef} className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
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

            {reportRunId && <AiFollowup reportRunId={reportRunId} />}

            <section ref={sectionRef} className="space-y-6 scroll-mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{current?.label}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {current?.presentQuestionIds.length ?? 0} {current?.presentQuestionIds.length === 1 ? "question" : "questions"} in this section
                  </p>
                </div>
              </div>

              {activeKey === "overview" && q5a && <ValidationSummary question={q5a} />}

              {activeKey === "data-quality" && <DataQualityScorecard report={report} />}

              {activeKey === "outcomes" && (
                <>
                  {q23c && leavers !== null && leavers > 0 && (
                    <ExitToPHCallout question={q23c} totalLeavers={leavers} />
                  )}
                  <EntryVsExitComparison report={report} />
                </>
              )}

              {sectionCharts.length > 0 && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {sectionCharts}
                </div>
              )}

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
