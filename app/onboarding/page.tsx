import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";

async function createOrgAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const cocNumber = String(formData.get("coc_number") ?? "").trim() || null;

  if (!name) {
    redirect("/onboarding?error=Name+is+required");
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name, coc_number: cocNumber })
    .select("id")
    .single();

  if (orgErr || !org) {
    redirect(`/onboarding?error=${encodeURIComponent(orgErr?.message ?? "Failed to create organization")}`);
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({ organization_id: org.id, role: "admin" })
    .eq("id", user.id);

  if (profErr) {
    redirect(`/onboarding?error=${encodeURIComponent(profErr.message)}`);
  }

  redirect("/");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profile?.organization_id) redirect("/");

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          <div className="text-base font-semibold text-foreground">APR Insight</div>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8">
          <div className="text-xs font-medium uppercase tracking-wider text-accent">Step 1 of 1</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Create your organization
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This becomes the workspace for your APR reports. You can invite teammates later.
          </p>

          {sp.error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {sp.error}
            </div>
          )}

          <form action={createOrgAction} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="name">
                Organization name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. New Hope C.O.R.P.S."
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="coc_number">
                CoC number <span className="normal-case text-muted-foreground">(optional)</span>
              </label>
              <input
                id="coc_number"
                name="coc_number"
                type="text"
                placeholder="e.g. FL-600"
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Create organization
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
