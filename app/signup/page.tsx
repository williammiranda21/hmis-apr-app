import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";

async function signupAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/signup?success=1");
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start visualizing your APR exports in minutes.
          </p>

          {sp.error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {sp.error}
            </div>
          )}
          {sp.success && (
            <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-foreground">
              Check your email for a confirmation link, then{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                sign in
              </Link>
              .
            </div>
          )}

          {!sp.success && (
            <form action={signupAction} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="full_name">
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </div>
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
                  minLength={8}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <div className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</div>
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Create account
              </button>
            </form>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
