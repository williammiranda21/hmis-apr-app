import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult, AprReport } from "@/lib/apr-schema/types";
import { supabaseServer } from "@/lib/supabase/server";
import { loadReport, persistAnalysis } from "@/lib/supabase/persist";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const compactReport = (report: AprReport) => {
  const out: Record<string, unknown> = {
    manifest: {
      project: report.manifest.projectName,
      type: report.manifest.hmisProjectTypeLabel,
      coc: report.manifest.cocNumber,
      period: `${report.manifest.reportStartDate} to ${report.manifest.reportEndDate}`,
      clients: report.manifest.totalActiveClients,
      households: report.manifest.totalActiveHouseholds,
    },
    questions: {} as Record<string, unknown>,
  };
  for (const [qid, q] of Object.entries(report.questions)) {
    if (q.notApplicable) continue;
    const rows = q.rows
      .filter((r) => !r.isSectionHeader)
      .map((r) => {
        const cells: Record<string, number | null> = {};
        for (const c of r.cells) {
          if (c.value !== 0 && c.value !== null) cells[c.colLabel] = c.value;
        }
        return { label: r.rowLabel, cells };
      })
      .filter((r) => Object.keys(r.cells).length > 0);
    if (rows.length === 0) continue;
    (out.questions as Record<string, unknown>)[qid] = {
      title: q.title,
      rows,
    };
  }
  return out;
};

const SYSTEM_PROMPT = `You are an HMIS data analyst expert helping a Continuum of Care (CoC) lead organization interpret an APR (Annual Performance Report) export.

You have deep knowledge of HUD's CoC APR/ESG-CAPER Programming Specifications and the HMIS Data Standards. The user is providing a structured JSON representation of the APR cells.

Your job is to produce:
1. **dataQualityFindings**: concrete data-quality issues (high "Data Not Collected" rates, logical inconsistencies, suspicious zeros, validation mismatches between Q5a and other tables). Use severity "critical" for blocking issues, "warning" for concerning patterns, "info" for noteworthy notes.
2. **recommendations**: programmatic, actionable recommendations to improve performance. Each recommendation must cite specific cells/questions as evidence and propose a concrete next step the program team could take.
3. **executiveSummary**: 2-3 paragraphs in plain language for a board/funder audience explaining how this program is performing.

Use the HMIS project type to calibrate expectations (e.g., PSH should have very high retention; ES should have shorter stays; SO/Outreach has different metrics).

Respond ONLY with a single JSON object matching this TypeScript type, with no preamble or markdown fences:

type Response = {
  dataQualityFindings: { severity: "info" | "warning" | "critical"; questionId: string; message: string; suggestedAction?: string }[];
  recommendations: { category: string; finding: string; evidence: string; suggestedAction: string }[];
  executiveSummary: string;
};`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set in the server environment." },
        { status: 503 }
      );
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = (await request.json()) as { reportRunId?: string; report?: AprReport };

    let report: AprReport | null = null;
    let reportRunId: string | null = null;

    if (body.reportRunId) {
      reportRunId = body.reportRunId;
      report = await loadReport(supabase, body.reportRunId);
      if (!report) {
        return NextResponse.json({ error: "Report not found or access denied." }, { status: 404 });
      }
    } else if (body.report) {
      report = body.report;
    } else {
      return NextResponse.json({ error: "Missing reportRunId or report in body." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const compact = compactReport(report);

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `APR data for analysis:\n\n${JSON.stringify(compact)}` },
          ],
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI response did not contain valid JSON.", raw: text },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as Omit<AnalysisResult, "generatedAt" | "model">;
    const result: AnalysisResult = {
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: MODEL,
    };

    if (reportRunId) {
      try {
        await persistAnalysis(supabase, reportRunId, result);
      } catch (e) {
        console.error("persistAnalysis failed:", e);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
