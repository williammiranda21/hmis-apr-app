import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadLatestAnalysis, loadReport } from "@/lib/supabase/persist";
import { extractMetrics } from "@/lib/apr-metrics";
import { BoardSummary } from "@/components/board-summary";

export default async function ReportSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const report = await loadReport(supabase, id);
  if (!report) notFound();

  const analysis = await loadLatestAnalysis(supabase, id);
  const metrics = extractMetrics(report);

  return <BoardSummary report={report} reportId={id} analysis={analysis} metrics={metrics} />;
}
