# ReelForge AI — Session Handoff (2026-06-24)

Agentic content factory making advertising reels for the user's products (SoulStarr =
Hinglish astrology reels; also CodeGraph, TripSynk, Calybe). Next.js 16 + Remotion v0.

## ⚠️ BLOCKER: Claude API capped until 2026-07-01 00:00 UTC
The content pipeline runs on Claude (idea/script/storyboard/speech-plan + the
romanized→Devanagari transliteration). The user's Anthropic key hit its usage limit, so
**generating new reels end-to-end is blocked until July 1**. The video ENGINE (physics,
depth, effects, render, FLUX images, local voice synth) needs no Claude and works fine.
Two ways forward (USER MUST PICK):
1. **Route LLM steps to Gemini** (user has `GEMINI_API_KEY`) to unblock generation now.
   Files to switch: `src/lib/storyboard.ts` (`MODEL = "claude-sonnet-4-6"`, `writeScript`+
   `buildStoryboard`), `src/lib/ideation.ts`, `src/lib/profile.ts`, `src/lib/speech-plan.ts`,
   and the transliterator `src/lib/translit.ts` (check which LLM it calls). Honest note told
   to user: Gemini Flash is fast + fine for translit/JSON, slightly weaker than Claude Sonnet
   on creative script quality + JSON reliability (harden parsing). Keep Claude as the
   post-July-1 default.
2. **Polish the video engine while capped** (no Claude needed).

## Branch / git
- `feat/phase-2-agentic-layer` — has everything. Commits this session: `24ad109` (voice/TTS
  service + bake-off), `d3cb352` (depth layering, 24-effect brand library, free voice, outro),
  `8b616c4` (real physics motion + 3D outro + director wind). **LOCAL ONLY.**
- **Push blocked:** remote is the friend's repo `sawanabhishek157-ui/reelforge-ai`; the user's
  account has no write access. They want a PR via their own fork/access — get that, then branch+PR.
- Commit only when asked. Don't push.

## What works now (the upgraded video engine)
- **Free voice in the pipeline:** local TTS service `scripts/tts-service/` (FastAPI on :8100,
  `uv run uvicorn app:app --port 8100`; Parler/Kokoro/Svara/Chatterbox on MPS). Wired via a
  `"local"` provider in `src/lib/tts.ts`. **SoulStarr default voice = `parler-mystic-f`** (deep
  mysterious Parler female — Gemini-verified emotional; the user liked it). Needs Devanagari →
  the pipeline transliterates via `translit.ts` (Claude — currently capped).
- **Depth-layered compositor** `src/remotion/LayeredScene.tsx`: subject/foreground on its own
  masked plane, effects behind + in front, strong per-layer parallax (director's `motionStyle`
  drives the camera), subject **wind-sway**, uses `backgroundUrl` plane when present (else full image).
- **Subject matting** `src/lib/matte.ts`: person mask via segmentation; falls back to a
  **depth-map foreground split** so landscape/no-subject scenes also layer (every scene has depth now).
- **24 effects + physics** `src/remotion/effects/` (registry `index.tsx`, `names.ts`, palettes
  `brands.ts`). Particle effects (leaves/petals/embers/snow/dust/sparks) are **real deterministic
  physics** — `src/remotion/physics/simulate.ts` (Euler + `@remotion/noise` turbulence, baked once)
  + `PhysicsParticles.tsx`. Plus weather/magic/cosmic/tech/flame + Lottie objects (rocket/confetti/
  building, `public/lottie/`). All palette-tinted.
- **Director assigns per scene** (`src/lib/storyboard.ts`): hook-first short script, motion on
  every scene, on-brand effects (constrained to `brandTheme(slug).effects`), and `windMood`
  (calm/breeze/gust/swirl → particle force + sway + parallax). Brand palette/tagline in `brands.ts`.
- **Branded outro** `src/remotion/Outro.tsx`: 3D kinetic metallic wordmark + moving cosmic
  backdrop + flames, auto-appended to every reel, themed per brand. (User wants it MORE premium —
  iterate; a real logo PNG would help.)
- **Stagger** `effects/Stagger.tsx`: effects cascade in over ~1.2s, not all at once.

## Pipeline data flow
`runs.ts` orchestrates: createRun→ideate→script→storyboard→images→voice→music→assemble(render).
`scene-images.ts` per scene: FLUX image (`segmind.ts`) + depth (`depth.ts`) + subject mask
(`matte.ts`). `runs.ts:runImages` builds the Remotion `Plan` (palette, effects, windMood,
subjectMaskUrl, backgroundUrl). Render via `remotion-render.ts`. `Root.tsx` derives duration from
`plan.durationSec` (outro adds 3.5s in `runVoice`). SoulStarr product id `f55e3538d2f9`, slug `soulstarr`.

## PENDING / next steps
1. **Task A — FLUX-Fill clean backgrounds** (NOT built; plan in `~/.claude/plans/elegant-dazzling-kite.md`):
   inpaint the subject region in `scene-images.ts` → subject-free `image.bg.png` → `SceneAsset.
   backgroundUrl`. Lets the foreground parallax HARD with no ghost-hole. `Scene.backgroundUrl`
   field + LayeredScene already consume it (fallback to imageUrl). Segmind FLUX Fill endpoint, or
   free fallback (edge-dilate mask + 1.08x oversample).
2. **Physics polish** (user feedback): make wind/gravity MORE visible — more particles, stronger
   forces, an obvious directional wind gust. (User noted the left-right "shake" is the CAMERA
   parallax/zoomdrift, not turbulence; turbulence is the particle wobble. Wants to SEE wind/gravity.)
3. **Outro**: make more premium / less basic; support a logo image.
4. **Gemini routing** (if user picks it) to unblock generation during the Claude cap.
5. **Phase 2 — content-intelligence + analytics/MCP** (planned, not started): free trend
   extraction, Meta MCP, an MCP over the user's EXISTING live analytics (page visits/drop-off) for
   data-driven content. User confirmed video-first, this next.

## Verify / run
- Local TTS up? `curl -s localhost:8100/health`. Restart: `cd scripts/tts-service && uv run uvicorn app:app --port 8100`.
- Full reel headless: `node scripts/drive-run.mjs f55e3538d2f9` (uses the dev server on :3000).
- Direct render of a saved plan (dodges the drive-run client timeout): extract `plan_json` from
  `data/reelforge.db` → `{plan}` props → `npx remotion render src/remotion/index.ts Reel out.mp4 --props=...`.
- Verify visuals: `ffmpeg -ss <t> -i out.mp4 -frames:v 1 f.png` + Read it, or Gemini-check audio/video.

## Gotchas
- `drive-run` client times out ~300s on long renders (undici headers, not a failure) → extract the
  plan + render directly. Don't double-background (`&` + run_in_background) — the wrapper exits and
  you lose the completion signal.
- macOS: no `timeout`; `node --env-file=.env` for scripts needing keys; `npx tsx` (tsx isn't a dep).
- Big test renders gitignored: `public/effects-test/`, `public/depth-test/` (the 9GB tts venv too).
  Latest demos there: `soulstarr-reel-v6.mp4` (physics, silent), `physics-preview.mp4`,
  `outro-preview.mp4`, `brand-showcase.mp4`.
- Lottie assets: download-verified ≠ content-verified — RENDER and eyeball before trusting.
- `background-clip:text` breaks under 3D transforms in headless Chrome (use solid color + textShadow).

## User preferences (from this session)
- Always state the exact save path + localhost URL for any generated file; never leave in /tmp.
- Wants the video to POP — strong visible motion, motion graphics, physics; "not a fake video."
- Free everything (no paid AI video, no per-char TTS). Multi-image-per-scene is OK if cheaper than video.
- Per-step user steering during generation: the Studio already has approve/regenerate-with-feedback/
  edit gates; finer per-scene control is a possible future enhancement (not a blocker — engine is committable).
