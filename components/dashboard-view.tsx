"use client";

import { Dashboard } from "./dashboard";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";

type Props = {
  report: AprReport;
  reportRunId: string;
  initialAnalysis?: AnalysisResult;
};

export function DashboardView({ report, reportRunId, initialAnalysis }: Props) {
  return <Dashboard report={report} reportRunId={reportRunId} initialAnalysis={initialAnalysis} />;
}
