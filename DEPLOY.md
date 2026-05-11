# Deploy guide

End-to-end checklist for getting APR Insight running locally and deployed to Vercel + Supabase.

## 1. Supabase — apply the database schema

1. Open <https://supabase.com/dashboard/project/hblbadhucsojbrhzzibn/sql/new>
2. Paste the entire contents of `apr-app/supabase/migrations/0001_init.sql`
3. Click **Run**
4. Verify in **Database → Tables** that you see: `organizations`, `profiles`, `report_runs`, `apr_cells`, `analyses`, `dq_findings`, `recommendations`.

## 2. Supabase — get your keys

Dashboard → **Settings → API**:

- **Project URL** → already set in `.env.local` and goes in Vercel as `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose to browser; RLS protects)
- **service_role** key — NOT used by this app. Don't deploy it. Keep it private.

## 3. Supabase — configure auth redirect URLs

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://hmis-apr-app.vercel.app` (or your actual Vercel production URL)
- **Redirect URLs** (add all that apply):
  - `https://hmis-apr-app.vercel.app/auth/callback`
  - `https://hmis-apr-app.vercel.app/**`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`

Without these, email-confirmation and password-reset links won't redirect back to the app correctly.

## 4. Anthropic — rotate the API key

1. Go to <https://console.anthropic.com> → **Settings → API Keys**
2. Revoke the previously exposed key
3. Create a new key (name it something like `apr-insight-prod`)
4. Paste it into both `.env.local` (for local dev) and Vercel env vars (for production)

## 5. Local — fill in `.env.local`

Edit `apr-app/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://hblbadhucsojbrhzzibn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key from step 2>
ANTHROPIC_API_KEY=<your new key from step 4>
```

Then `npm run dev` should let you sign up, create an org, upload an APR, and run AI analysis end-to-end.

## 6. Vercel — set environment variables

Project → **Settings → Environment Variables**. Add for **Production**, **Preview**, and **Development**:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hblbadhucsojbrhzzibn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (your anon key) |
| `ANTHROPIC_API_KEY` | (your new key) |

> The `NEXT_PUBLIC_` prefix means the value is bundled into the browser code. The anon key is designed to be public — RLS policies are what protect your data. The Anthropic key is NOT prefixed, stays server-only.

## 7. Push to GitHub

```bash
cd "apr-app"
git remote add origin https://github.com/williammiranda21/hmis-apr-app.git
git add .
git commit -m "Initial APR Insight v1 — parser, dashboard, AI insights, Supabase + auth"
git branch -M main
git push -u origin main
```

Vercel will auto-build on push. First deploy takes ~2–3 minutes.

## 8. Smoke test on production

Once Vercel reports the deploy is live:

1. Visit `https://hmis-apr-app.vercel.app`
2. Sign up (you'll get a confirmation email — click the link)
3. Create your organization
4. Drop your APR ZIP
5. Click "Run AI analysis"

If anything errors, check:
- Vercel → **Logs** for server-side errors
- Supabase → **Logs** for query/auth errors
- Browser DevTools console for client errors

## Notes

- The `.env*` glob in `.gitignore` covers `.env.local`, `.env.local.example`, and any other variant — none of these are committed.
- The HUD reference PDFs and APR sample ZIP live in the parent directory (`../`), outside this repo. They are not pushed.
- The Anthropic API has prompt caching enabled on the system prompt; subsequent analyses of the same APR are cheaper.
