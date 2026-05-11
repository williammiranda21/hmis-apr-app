import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";

export const persistReport = async (
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  report: AprReport
): Promise<string> => {
  const m = report.manifest;
  const { data: run, error: runErr } = await supabase
    .from("report_runs")
    .insert({
      organization_id: organizationId,
      uploaded_by: userId,
      project_name: m.projectName || "(unnamed project)",
      project_id: m.projectId || null,
      hmis_project_type: m.hmisProjectType || null,
      hmis_project_type_label: m.hmisProjectTypeLabel || null,
      coc_number: m.cocNumber || null,
      geocode: m.geocode || null,
      organization_name: m.organizationName || null,
      software_version: m.hmisSoftwareNameAndVersion || null,
      report_start_date: m.reportStartDate || null,
      report_end_date: m.reportEndDate || null,
      total_active_clients: m.totalActiveClients || 0,
      total_active_households: m.totalActiveHouseholds || 0,
      source_file_name: report.sourceFileName,
    })
    .select("id")
    .single();

  if (runErr || !run) {
    throw new Error(`Failed to insert report_run: ${runErr?.message}`);
  }

  const cells: Record<string, unknown>[] = [];
  for (const q of Object.values(report.questions)) {
    for (const row of q.rows) {
      if (row.isSectionHeader) {
        cells.push({
          report_run_id: run.id,
          question_id: q.questionId,
          row_idx: row.rowIdx,
          row_label: row.rowLabel,
          section_label: row.sectionLabel ?? null,
          is_section_header: true,
          col_idx: null,
          col_label: null,
          value_numeric: null,
          value_type: null,
        });
        continue;
      }
      for (const cell of row.cells) {
        cells.push({
          report_run_id: run.id,
          question_id: q.questionId,
          row_idx: cell.rowIdx,
          row_label: cell.rowLabel,
          section_label: cell.sectionLabel ?? null,
          is_section_header: false,
          col_idx: cell.colIdx,
          col_label: cell.colLabel,
          value_numeric: cell.value,
          value_type: cell.valueType,
        });
      }
    }
  }

  // Insert in chunks to stay within Supabase row limits
  const CHUNK = 500;
  for (let i = 0; i < cells.length; i += CHUNK) {
    const slice = cells.slice(i, i + CHUNK);
    const { error } = await supabase.from("apr_cells").insert(slice);
    if (error) {
      throw new Error(`Failed to insert apr_cells batch: ${error.message}`);
    }
  }

  return run.id;
};

export const persistAnalysis = async (
  supabase: SupabaseClient,
  reportRunId: string,
  analysis: AnalysisResult
): Promise<string> => {
  const { data: a, error: aErr } = await supabase
    .from("analyses")
    .insert({
      report_run_id: reportRunId,
      executive_summary: analysis.executiveSummary,
      model: analysis.model,
    })
    .select("id")
    .single();

  if (aErr || !a) {
    throw new Error(`Failed to insert analysis: ${aErr?.message}`);
  }

  if (analysis.dataQualityFindings.length > 0) {
    const { error } = await supabase.from("dq_findings").insert(
      analysis.dataQualityFindings.map((f) => ({
        analysis_id: a.id,
        severity: f.severity,
        question_id: f.questionId,
        message: f.message,
        suggested_action: f.suggestedAction ?? null,
      }))
    );
    if (error) throw new Error(`Failed to insert dq_findings: ${error.message}`);
  }

  if (analysis.recommendations.length > 0) {
    const { error } = await supabase.from("recommendations").insert(
      analysis.recommendations.map((r) => ({
        analysis_id: a.id,
        category: r.category,
        finding: r.finding,
        evidence: r.evidence,
        suggested_action: r.suggestedAction,
      }))
    );
    if (error) throw new Error(`Failed to insert recommendations: ${error.message}`);
  }

  return a.id;
};

export const loadReport = async (
  supabase: SupabaseClient,
  reportRunId: string
): Promise<AprReport | null> => {
  const { data: run, error: runErr } = await supabase
    .from("report_runs")
    .select("*")
    .eq("id", reportRunId)
    .single();

  if (runErr || !run) return null;

  const { data: cells, error: cellsErr } = await supabase
    .from("apr_cells")
    .select("*")
    .eq("report_run_id", reportRunId)
    .order("question_id", { ascending: true })
    .order("row_idx", { ascending: true })
    .order("col_idx", { ascending: true });

  if (cellsErr || !cells) {
    throw new Error(`Failed to load cells: ${cellsErr?.message}`);
  }

  // Reconstruct AprReport shape
  const questions: AprReport["questions"] = {};
  for (const c of cells) {
    const qid = c.question_id as string;
    if (!questions[qid]) {
      questions[qid] = {
        questionId: qid,
        fileName: `${qid}.csv`,
        title: qid,
        columns: [],
        rows: [],
        notApplicable: false,
      };
    }
    const q = questions[qid];

    if (c.is_section_header) {
      q.rows.push({
        rowIdx: c.row_idx,
        rowLabel: c.row_label,
        sectionLabel: c.section_label ?? undefined,
        isSectionHeader: true,
        cells: [],
      });
      continue;
    }

    if (!q.columns.includes(c.col_label) && c.col_label) q.columns.push(c.col_label);

    let row = q.rows.find((r) => !r.isSectionHeader && r.rowIdx === c.row_idx);
    if (!row) {
      row = {
        rowIdx: c.row_idx,
        rowLabel: c.row_label,
        sectionLabel: c.section_label ?? undefined,
        isSectionHeader: false,
        cells: [],
      };
      q.rows.push(row);
    }
    row.cells.push({
      rowIdx: c.row_idx,
      rowLabel: c.row_label,
      sectionLabel: c.section_label ?? undefined,
      colIdx: c.col_idx,
      colLabel: c.col_label,
      value: c.value_numeric !== null ? Number(c.value_numeric) : null,
      valueType: (c.value_type ?? "count") as AprReport["questions"][string]["rows"][number]["cells"][number]["valueType"],
    });
  }

  // Re-apply human titles + notApplicable flag
  const { questionTitle } = await import("@/lib/apr-parser/questions");
  for (const q of Object.values(questions)) {
    q.title = questionTitle(q.questionId);
    q.notApplicable = q.rows.length === 0;
  }

  return {
    manifest: {
      organizationName: run.organization_name ?? "",
      organizationId: "",
      projectName: run.project_name,
      projectId: run.project_id ?? "",
      hmisProjectType: run.hmis_project_type ?? "",
      hmisProjectTypeLabel: run.hmis_project_type_label ?? "",
      cocNumber: run.coc_number ?? "",
      geocode: run.geocode ?? "",
      hmisSoftwareNameAndVersion: run.software_version ?? "",
      reportStartDate: run.report_start_date ?? "",
      reportEndDate: run.report_end_date ?? "",
      totalActiveClients: run.total_active_clients ?? 0,
      totalActiveHouseholds: run.total_active_households ?? 0,
    },
    questions,
    uploadedAt: run.uploaded_at,
    sourceFileName: run.source_file_name ?? "",
    warnings: [],
  };
};

export const loadLatestAnalysis = async (
  supabase: SupabaseClient,
  reportRunId: string
): Promise<AnalysisResult | null> => {
  const { data: a } = await supabase
    .from("analyses")
    .select("*")
    .eq("report_run_id", reportRunId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!a) return null;

  const [{ data: findings }, { data: recs }] = await Promise.all([
    supabase.from("dq_findings").select("*").eq("analysis_id", a.id),
    supabase.from("recommendations").select("*").eq("analysis_id", a.id),
  ]);

  return {
    executiveSummary: a.executive_summary ?? "",
    dataQualityFindings: (findings ?? []).map((f) => ({
      severity: f.severity,
      questionId: f.question_id,
      message: f.message,
      suggestedAction: f.suggested_action ?? undefined,
    })),
    recommendations: (recs ?? []).map((r) => ({
      category: r.category,
      finding: r.finding,
      evidence: r.evidence,
      suggestedAction: r.suggested_action,
    })),
    generatedAt: a.generated_at,
    model: a.model ?? "",
  };
};
