import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
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
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your APR Insight account.</p>

          {sp.error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {sp.error}
            </div>
          )}

          <form action={loginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={sp.next ?? "/"} />
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Sign in
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
