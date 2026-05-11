import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AprReport } from "@/lib/apr-schema/types";
import { supabaseServer } from "@/lib/supabase/server";
import { loadReport } from "@/lib/supabase/persist";

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

const SYSTEM_PROMPT = `You are an HMIS data analyst expert helping a Continuum of Care (CoC) lead organization interpret their APR (Annual Performance Report) export. You have deep knowledge of HUD's CoC APR/ESG-CAPER Programming Specifications and the HMIS Data Standards.

The user is asking follow-up questions about a specific APR. Use the structured data provided to give grounded, specific answers. Cite question numbers (e.g., "per Q23c..."). Keep responses focused and under 250 words unless the question genuinely requires more. Calibrate expectations to the HMIS project type.

If the data doesn't contain enough to answer the question (e.g., user asks about something not in this APR), say so clearly rather than guessing.`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 503 });
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = (await request.json()) as {
      reportRunId?: string;
      question: string;
      history?: Message[];
    };

    if (!body.reportRunId || !body.question?.trim()) {
      return NextResponse.json({ error: "Missing reportRunId or question." }, { status: 400 });
    }

    const report = await loadReport(supabase, body.reportRunId);
    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const compact = compactReport(report);

    const client = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Here is the structured APR data for the report you'll be answering questions about:\n\n${JSON.stringify(compact)}`,
            cache_control: { type: "ephemeral" },
          },
        ],
      },
      {
        role: "assistant",
        content: "Got it — I have the APR loaded. What would you like to know?",
      },
      ...(body.history ?? []).map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
      { role: "user", content: body.question.trim() },
    ];

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return NextResponse.json({ answer: text, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
