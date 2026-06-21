# ReelForge AI — Session Handoff (2026-06-21)

Agentic content-factory for advertising the user's products (SoulStarr = Hinglish
astrology reels, plus CodeGraph, SubclassCard, two app-store apps, etc.). Built on
the friend's Next.js 16 + Remotion v0.

## Branches / git
- `feat/phase-2-agentic-layer` ← **current, has everything** (Phase 1 + Phase 2).
- `feat/phase-1-content-engine` ← Phase 1 only. `main` ← clean original base.
- Not yet merged to main (ask user before merging / PRs).
- Commit only when asked. Attribution disabled (no Co-Authored-By).

## Status: Phase 1 (motion engine) ✅ + Phase 2 (agentic pipeline) ✅ both work end-to-end
A full reel generates from product → ideas → script → storyboard → images → voice →
music → assemble, gated for human approval. UI at **http://localhost:3000/studio**
(dev server is running: `npm run dev`). Example finished reel:
`public/runs/run-53d5a0e6476b/output-mg.mp4`.

## The MOTION journey (important — lots of dead ends ruled out)
- **Parallax (DepthFlow) is abandoned for people**: single-image parallax morphs
  hard-edged subjects (people) at ANY camera path/amplitude (tested circular,
  forward, 0.3–0.8 → 6–8/10 morph). Kept only as opt-in (AMP>0) for person-free scenes.
- **Morph-free recipe (default)**: rack focus (depth-of-field pull via DepthFlow
  height≈0 + blur) + one-directional forward dolly + **Ken Burns** (Remotion,
  scale 1.04→1.24) + **atmosphere** overlay + **cinemagraph** (sky/water region) +
  grade/grain. Verified morph 0–1/10.
- **MOTION GRAPHICS = the breakthrough** (user's idea): 6 deterministic Remotion
  overlays in `src/remotion/motiongraphics/` — StarField, CosmicDust, ZodiacWheel,
  OrbitingBodies, ConstellationLines, LightRays. Composited via `MotionGraphicsLayer`
  in all `SceneView` branches; storyboard director assigns 1–2/scene by theme; runs
  maps them into the Plan. Gemini rated the reel **9/10 dynamic** with these. They
  pop on dark/cosmic skies; get lost on busy/bright images (expected).
- Self-verify tools: `scripts/see-video.mjs <mp4> "<prompt>"` (Gemini watches —
  uses GEMINI_API_KEY; downscale long clips first, it choked on a 41s file) and
  `scripts/motion-meter.py` (OpenCV optical flow via `uv run --with opencv-python-headless`).
  NOTE: optical-flow undersells slow/large-sky motion — trust Gemini + the user's eyes.

## VOICE — in progress (this is where we stopped)
- **Decisions locked:** (1) use fixed high-quality voices + Speech Plan (NO cloning
  for now). (2) Speech Plan wired FIRST (done). 
- **DONE:** Speech Performance Plan (`src/lib/speech-plan.ts`, Claude tags per-sentence
  emotion/energy/speed/pauses/emphasis) is now wired into the agentic voice step
  (`runVoice` in `src/lib/runs.ts`) → `generateVoiceover(script, out, voiceId, speechPlan)`.
  Just regenerated voice for run-53d5a0e6476b (737K vs old 240K) — NOT yet listened to.
- **Voice findings** (compare at http://localhost:3000/voice-options/index.html):
  Veena (Segmind, Hindi-native) & ElevenLabs = 8–9/10; Chatterbox (Segmind) = 7–8/10,
  romanized-only (garbles Devanagari), supports cloning + `exaggeration`; Edge needs
  Devanagari (translit auto-applied for lang:"hi" voices). User: Veena/ElevenLabs
  too robotic vs IG memes; Edge "good but missing something."
- **NEXT (voice):**
  1. Listen to the speech-plan-directed voice (run-53d5a0e6476b/voice.mp3) — judge if
     the performance direction made it noticeably more human. Tune speech-plan→engine
     mapping if needed.
  2. **Pick & set deep/mysterious male + female brand voices** the user wants. Engine
     candidates: ElevenLabs Antoni (deep male, but lang:"en" so won't auto-transliterate —
     needs Devanagari handling) / Edge Madhur (male hi, free) / Veena agastya (needs
     adding as a tts.ts provider). Set per-product `default_voice_id`. The user wants a
     consistent male + female voice, deep/mysterious for SoulStarr, different tone per product.
  3. **Per-product voice config**: extend product profile to store engine + voice + tone +
     gender so each brand has its own voice. Storyboard already uses `product.defaultVoiceId`.
  4. Cloning via Segmind Chatterbox is deferred (needs a public reference-audio URL; works
     romanized; `exaggeration` for emotion). Revisit if they want a unique voice later.

## Stack / providers (CRITICAL)
- **fal.ai is DEAD** (out of balance, user won't top up). Use **Segmind** (key in store).
- Images: `src/lib/segmind.ts` (FLUX schnell, dims must be /64). Music: `src/lib/music-gen.ts`
  (MusicGen). Voice TTS: Edge (free) + ElevenLabs (free plan: limited, library voices blocked)
  + Segmind Veena/Chatterbox (tested via scripts, not yet in tts.ts as providers).
- Depth: `src/lib/depth.ts` (Depth Anything v2 LARGE, local/free). DepthFlow: uv tool
  `~/.local/share/uv/tools/depthflow/bin/python scripts/df_scene.py` (the bare CLI renders
  STATIC — must use df_scene.py). Segmentation (cinemagraph): `src/lib/segment.ts`.
- Env via `seedenv .` (ANTHROPIC, SEGMIND, ELEVENLABS, GEMINI, FAL). `.env*` gitignored.
- Codegraph indexed for this repo (`codegraph build`).

## Phase 2 architecture
- DB (`src/lib/db.ts`): `products` (brand profile) + `content_runs` (step/status + JSON
  artifacts: idea/script/**storyboard_json**/plan/feedback). Types: `src/lib/types.ts`.
- Step libs: `products.ts`, `profile.ts` (Claude drafts a profile), `ideation.ts`,
  `storyboard.ts` (writeScript + buildStoryboard — image prompts demand 3 depth planes,
  assigns motionStyle/cinemagraph/motionGraphics), `scene-images.ts` (segmind+depth+mask).
- Orchestrator `src/lib/runs.ts`: createRun, approveStep (advance+gen next), regenerateStep,
  editStep. Assemble builds a Remotion Plan + renders via `renderReel`.
- API: `/api/products(+draft,[id])`, `/api/runs(+[id]/approve|regenerate|edit)`.
- UI: `(app)/studio-products` (draft+save profiles), `(app)/studio` (start run),
  `(app)/studio/[runId]` (gated wizard: approve / regenerate-w-feedback / edit).
- Existing SoulStarr product id: `f55e3538d2f9`. Drive a full run headless:
  `node scripts/drive-run.mjs <productId>`.

## Gotchas (bugs already hit + fixed — watch for these patterns)
- API responses are enveloped: `{run}`, `{product}`, `{runs}`, `{products}` — UI must read `.run` etc.
- Async route handlers must `await` createRun/approveStep/regenerateStep.
- `content_runs.storyboard_json` column is required (storyboard must persist between gates).
- macOS: no `timeout`/`\b` in sed (BSD). `node --env-file=.env` for scripts needing keys.
- Long curl/Gemini calls auto-background past 2min; poll the output file.
- Subagents may create stray `.claude/worktrees/` + auto-commit — clean up after.

## Throwaway/dev artifacts (gitignored or deletable)
`public/{voice-ab,voice-ab-demo,seg-test,cine-demo,depth-test,voice-options,runs}/`,
`data/*.json`. Dev scripts kept as references: voice-ab, motion-demo, depthflow-demo,
gen-*, see-video, motion-meter, df_scene, drive-run, *-test, *-sample.

## Immediate next steps
1. **Voice**: judge the speech-plan voice; pick + set deep male/female brand voices;
   per-product voice config. (User actively waiting on this.)
2. Generate product profiles for the other products (CodeGraph, SubclassCard, apps) —
   Claude drafts from repo/store listings, user edits.
3. Consider merging Phase 1 + Phase 2 to main (ask first).
4. Phase 3 (deferred): batch/calendar, auto-grounding, multi-platform posting.
