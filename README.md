# ReelForge AI — Frontend

Frontend-only Next.js app for **ReelForge AI**, a platform that turns a script
plus reference images into a short vertical video (9:16) with AI-generated
scenes, voiceover, and captions.

> This repo currently ships the **UI shell** — pages, navigation, mock data,
> static previews. Backend logic (AI pipeline, render queue, auth) will be
> wired up later following the plan in `AI-Reel-Studio-Local.pdf`.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** strict
- **Tailwind CSS v4**
- **lucide-react** icons
- No backend, no auth, no database — pure frontend

## Pages

| Route | What's there |
|---|---|
| `/` | Dashboard — welcome banner, 5-step process card, Recent Videos table |
| `/create` | Create Video — script + image upload, voice picker, live preview |
| `/projects` | Projects list with search, filter, status, pagination |
| `/assets` | Library of uploaded + generated assets (images, videos, audio, scripts) |
| `/voice-library` | Voice catalog with filters, preview waveforms, "Select" CTA |
| `/settings` | Placeholder rows (Profile, Billing, Notifications, …) |

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Production build

```bash
npm run build
npm start
```

## Layout

```
src/
├── app/
│   ├── (app)/                # route group with sidebar + topbar layout
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Dashboard
│   │   ├── create/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── assets/page.tsx
│   │   ├── voice-library/page.tsx
│   │   └── settings/page.tsx
│   ├── layout.tsx            # root html / body
│   └── globals.css           # Tailwind v4 theme tokens
├── components/
│   ├── layout/               # Sidebar, Topbar, Logo
│   ├── create/Stepper.tsx
│   └── ui/                   # StatusBadge, Thumb, Waveform
└── lib/
    ├── cn.ts                 # clsx + tailwind-merge helper
    └── data.ts               # static dummy data
```

## Next steps (when backend lands)

The implementation roadmap lives in **`AI-Reel-Studio-Local.pdf`**:

1. Add SQLite (better-sqlite3) and a `projects`/`scenes` schema
2. Add API routes: `/api/plan` (Claude), `/api/generate` (FLUX + TTS), `/api/render` (Remotion)
3. Wire Remotion `<Player/>` into `/create` for the live preview
4. Optional: add Auth (NextAuth or Supabase Auth) once multi-user is needed

For now, all data is hard-coded in `src/lib/data.ts` — easy to swap with real API calls later.

## Codegraph (code navigation)

This repo is registered in the local codegraph workspace, so the `mcp__codegraph__*`
tools (find_symbol, callers, blast_radius, semantic_search) work against it. Config
lives in `.codegraph.yml` (committed); the graph DB in `.codegraph/` is gitignored.

Re-index after significant changes:

```bash
CG=/Users/smochan/Documents/projects/codegraph/.venv/bin/codegraph
$CG build          # rebuild the graph (incremental by default)
$CG status         # check graph freshness / drift
```
