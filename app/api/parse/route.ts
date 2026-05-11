import { NextRequest, NextResponse } from "next/server";
import { parseAprZip } from "@/lib/apr-parser/parse";
import { supabaseServer } from "@/lib/supabase/server";
import { persistReport } from "@/lib/supabase/persist";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "You must create an organization before uploading reports.", redirect: "/onboarding" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded under 'file' field." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "File must be a .zip APR export." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const report = await parseAprZip(buffer, file.name);
    const reportRunId = await persistReport(supabase, profile.organization_id, user.id, report);

    return NextResponse.json({ ...report, id: reportRunId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
