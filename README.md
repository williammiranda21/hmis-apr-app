# APR Insight

Local web tool that ingests a WellSky / Sage-format **APR (Annual Performance Report) export ZIP** and renders an interactive dashboard with AI-driven data-quality findings and performance recommendations.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Recharts (visualizations)
- jszip + papaparse (APR parsing)
- @anthropic-ai/sdk (AI analysis)

## Local development

```bash
cd apr-app
cp .env.local.example .env.local   # then paste your Anthropic API key
npm run dev
```

Open <http://localhost:3000>, drop your APR ZIP onto the upload zone.

## Project layout

```
apr-app/
├── app/
│   ├── page.tsx                 # Upload + dashboard entry
│   ├── layout.tsx
│   └── api/
│       ├── parse/route.ts       # ZIP → normalized AprReport
│       └── analyze/route.ts     # AprReport → AI findings + recommendations
├── components/
│   ├── upload-zone.tsx
│   ├── dashboard.tsx
│   ├── manifest-header.tsx
│   ├── question-table.tsx
│   ├── featured-charts.tsx
│   └── ai-insights.tsx
└── lib/
    ├── apr-parser/              # ZIP + per-question CSV parsing
    └── apr-schema/              # Shared TypeScript types
```

## What it does

1. **Parse** — unzips the APR export and normalizes every `Q*.csv` into a single typed `AprReport` structure. Handles WellSky quirks: triple-quoted row labels, section-header rows, mixed value types per matrix.
2. **Visualize** — featured charts for race/ethnicity (Q12), length of stay (Q22a1), exit destinations (Q23c), and household composition (Q7a); plus a generic table renderer for every other question, grouped by category.
3. **Analyze** — sends the structured report to Claude Sonnet 4.6 with HUD APR context, returns severity-tagged data-quality findings and category-tagged performance recommendations with cited evidence.

## Privacy

The APR export is **already aggregated** — no client-level identifiers leave your system. AI requests send only counts and labels.

## Next steps

- Add Supabase persistence to keep history of report runs and enable trend comparison.
- Add per-run diff view (current vs. prior period).
- Expand featured charts to cover more questions.
- Role-based views (case manager / leadership / board).
