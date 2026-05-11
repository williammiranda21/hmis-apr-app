import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { loadLatestAnalysis, loadReport } from "@/lib/supabase/persist";
import { DashboardView } from "@/components/dashboard-view";

export default async function ReportDetailPage({
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

  return <DashboardView report={report} reportRunId={id} initialAnalysis={analysis ?? undefined} />;
}
