# ReelForge AI — Session Handoff (2026-06-28)

Agentic content factory making advertising reels for the user's products (SoulStarr =
Hinglish astrology reels; also CodeGraph, TripSynk, Calybe). Next.js 16 + Remotion.

The video ENGINE is the mature part. The end-to-end generation pipeline works but its
LLM steps are gated by the Claude cap below (Gemini fallback wired).

## ⚠️ Claude API capped until 2026-07-01 00:00 UTC
The content pipeline's LLM steps (idea/script/storyboard/speech-plan + romanized→Devanagari
transliteration) run on Claude. The user's Anthropic key is over its limit until **July 1**.
- **Gemini fallback is now WIRED** (`364169d`, `ec23e69`): a provider-routing adapter (`src/lib/llm.ts`)
  runs these steps on Gemini (`GEMINI_API_KEY`) while Claude is capped, with 503/429 backoff.
  Gemini Flash is fine for translit/JSON, slightly weaker on creative script quality — keep Claude
  as the post-July-1 default.
- The video engine (physics, depth, effects, render, FLUX images, local voice) needs NO Claude.

## Branch / git
- Working branch: `feat/phase-2-agentic-layer` (tracks `origin`, push works now).
- Remote `origin` = `sawanabhishek157-ui/reelforge-ai` (collaborator access confirmed; `gh` logged in as `smochan`).
- **Workflow: never push to `main` directly — always branch + PR.** Commit only when asked.

## ★ THE SHOWCASE REEL + the mask-curation rule (READ THIS FIRST)
`src/remotion/showcase-entry.tsx` (Remotion composition id `Showcase`) is a ~3-min capability
sizzle reel exercising the whole engine: living-photo subject motion, physics particles, depth
parallax, cosmic/weather/magic/tech effects, motion graphics, kinetic captions, 3D outro.
Render: `npx remotion render src/remotion/showcase-entry.tsx Showcase out.mp4`.
Latest good render: `public/effects-test/reelforge-showcase-v5.mp4` (music bed `public/music/epic.mp3`).

**CRITICAL ENGINE TRUTH — masks are NOT all object cut-outs.** `matte.ts` produces a BiRefNet
object cut-out ONLY when BiRefNet succeeds; otherwise it falls back to a **depth-foreground split**
(roughly the bottom ~half of the frame). We measured the existing run assets:
- **Clean object cut-outs (coverage 3–18%, edges clear):** ONLY `public/runs/run-4dfe382f4be1/`
  scenes 0,2,3,4 (pendant, crystal ball, two-figures, candle).
- **Depth-split fallbacks (~45% coverage, white across the whole bottom edge):** every other run's
  masks (run-0260…, run-756…, and run-4dfe382f4be1 scene 1).

**RULE: subject-led "living photo" motion (locked background, only the subject moves) is ONLY valid
on a clean object cut-out.** Running subject-led motion on a depth-split swings half the frame —
that was the original "clouds/moon move with the pendulum / moon sliced in half" bug. Depth-split
masks MUST be used CAMERA-LED (`subjectMotion: "none"`), where the split gives nice parallax depth
and nothing swings. The showcase encodes this: 5 marquee subject-led scenes on the 4 clean cut-outs,
everything else camera-led. If you add scenes, classify the mask first (coverage + bottom-edge touch).

## The living-photo / motion engine (`src/remotion/LayeredScene.tsx`) — how it works + what was fixed
Depth-ordered compositor: z0 background plane (`backgroundUrl` = clean `image.bg.png`), z1 effects-behind
+ motion-graphics, z2 masked subject plane (camera transform outer + physical secondary motion inner),
z3 effects-front, z4 grade/vignette/grain/caption.
- **`subjectLed` (subjectMotion ≠ "none") → `camGain = 0`** = background plane perfectly locked, only
  the subject's secondary motion plays. `"none"` → `camGain = 1` = camera-led push + parallax.
- **Mask-mode fix (KEY):** the mask PNG is white-on-black and FULLY OPAQUE (shape in luminance, not
  alpha). CSS `mask-image` defaults to `mask-mode: alpha` → on an opaque PNG it clips NOTHING, so the
  whole image rode the subject's swing. Fix = one property: **`maskMode: "luminance"`**. Chrome-headless
  reads the unprefixed property (don't add `WebkitMaskMode` — not a real CSS prop, TS errors).
- **Subject motion model:** each motion (pendulum/float/sway/breathe) blends two incommensurate sines
  + slow `@remotion/noise` wander + a per-scene seed + a decay/"life" amplitude envelope, so it reads as
  physical and varies shot-to-shot (was a single uniform `sin()` = robotic).
- **Camera-led parallax is TRANSLATION-dominant** (~100px whole-frame travel — the threshold where it
  reads as real motion; pure zoom on dark plates was imperceptible). Big overscan (`1.18`) hides plane
  edges so the bold pan never reveals a black edge or the inpaint-fill boundary. Presets: zoomdrift
  (diagonal), vertical, orbit (horizontal — use for scenes with content near the TOP edge, e.g. a
  planet/arch, so the pan can't slice it), dolly (rising push).

## Background fill — two-tier design (DECISION, keep)
The clean `image.bg.png` plane (subject erased + hole filled) has two implementations:
1. **Free local smear (DEFAULT)** — `src/lib/inpaint.ts`: dilate mask → BFS nearest-boundary fill →
   box-blur. Soft, deterministic, $0. Good enough because the bg plane sits behind the subject + effects.
   Leaves a faint ghost on close inspection.
2. **Segmind FLUX Fill (RESERVED)** — `src/lib/segmind.ts`, opt-in via `BG_INPAINT=flux`. Real generative
   inpaint, sharper. **Only needed for detail-rich backgrounds** the smear can't fake. Costs money; leave
   on the free tier until a detail-rich bg actually breaks, then flip the flag.

## What we tried / what's NOT fully solved (limitations)
- **No true volumetric parallax.** Camera-led shots are a strong, depth-differentiated camera PUSH
  (foreground plane travels faster than background), but from a single still split into 2 planes it
  reads as a polished camera move, not a 3D fly-through. Real volumetric parallax needs depth-layer
  reconstruction (multi-slice from the depth map) — a separate, larger feature if ever wanted.
- **Depth-split masks put the hero object in the slower plane.** On those scenes the salient object is
  often in the background half, so its parallax is subtle. Acceptable for landscapes; that's why hero
  objects get clean cut-outs + subject-led motion instead.
- **Lottie objects (confetti/rocket/building) read cartoonish** over photoreal mystical plates — cut from
  the showcase. They exist in the registry; only use them on scenes whose style matches.
- **Quality bar = automated frame-by-frame audit.** A reusable workflow audits the reel segment-by-segment
  (extract frames + difference maps, classify systemic vs one-off). Saved script:
  `.../workflows/scripts/showcase-v2-reaudit-*.js` (edit VIDEO path + frame prefix, re-run). It was the
  tool that caught the locked-vs-parallax and clipping issues across v1→v5.

## What works now (engine inventory)
- **Free voice:** local TTS `scripts/tts-service/` (FastAPI :8100; Parler/Kokoro/Svara/Chatterbox on MPS),
  `"local"` provider in `src/lib/tts.ts`. SoulStarr default voice `parler-mystic-f`. Needs Devanagari →
  `translit.ts` (LLM, Gemini while capped).
- **Subject matting** `src/lib/matte.ts`: BiRefNet (`onnx-community/BiRefNet_lite`) object cut-out →
  falls back to SegFormer / depth-split. See the curation rule above.
- **27 effects + real physics** `src/remotion/effects/` (`names.ts`, `index.tsx`, palettes `brands.ts`).
  Particles (leaves/petals/embers/snow/dust/sparks) are deterministic physics — `physics/simulate.ts`
  (Euler + `@remotion/noise`, baked once) + `PhysicsParticles.tsx`. Plus weather/magic/cosmic/tech/flame
  + Lottie. `EFFECT_BAND` splits each into behind/front of the subject.
- **6 motion graphics** `src/remotion/motiongraphics/` (starField, cosmicDust, zodiacWheel, orbitingBodies,
  constellationLines, lightRays). Note: orbitingBodies/constellationLines glyphs can clip frame edges.
- **3D branded outro** `src/remotion/Outro.tsx`: metallic kinetic wordmark + cosmic backdrop + flames,
  appended per reel. Outro is `OUTRO_SEC = 5.0s` in `ReelComposition.tsx`. Wordmark settle spring fixed
  (was creeping/drifting the whole outro). Still wants: real logo PNG + beveled-metal treatment.

## Pipeline data flow (end-to-end generation)
`runs.ts` orchestrates: createRun→ideate→script→storyboard→images→voice→music→assemble(render).
`scene-images.ts` per scene: FLUX image (`segmind.ts`) + depth (`depth.ts`) + subject mask (`matte.ts`)
+ clean background (`inpaint.ts`). `runs.ts:runImages` builds the Remotion `Plan` (palette, effects,
windMood, subjectMaskUrl, backgroundUrl). Render via `remotion-render.ts`. `Root.tsx` derives duration
from `plan.durationSec`. SoulStarr product id `f55e3538d2f9`, slug `soulstarr`.

## Verify / run
- Render the showcase: `npx remotion render src/remotion/showcase-entry.tsx Showcase out.mp4 --log=error`.
  Fast slice for iteration: `--frames=START-END --scale=0.5`.
- Full reel headless: `node scripts/drive-run.mjs f55e3538d2f9` (needs dev server on :3000).
- Direct render of a saved plan (dodges drive-run timeout): extract `plan_json` from `data/reelforge.db`
  → props → `npx remotion render src/remotion/index.ts Reel out.mp4 --props=...`.
- Verify visuals WITHOUT trusting one frame: extract several frames + a **difference map** between two
  times (`ffmpeg -i a.png -i b.png -lavfi "blend=all_mode=difference,eq=brightness=0.3:contrast=5"`):
  bright = moved, flat = static. A **ghost/average overlay** (`blend=all_mode=average`) shows motion as
  doubling. SSIM is a poor proxy — animated overlays inflate it; check geometry directly.
- Local TTS up? `curl -s localhost:8100/health`. Restart: `cd scripts/tts-service && uv run uvicorn app:app --port 8100`.

## Gotchas
- **Masks: classify before subject-led motion** (see curation rule). Coverage + bottom-edge white% tells
  cut-out (low, clean) from depth-split (~45%, bottom 100%).
- CSS `mask-image` defaults to `mask-mode: alpha`; our masks need `maskMode: "luminance"`.
- Camera-led motion must travel ~100px to read; keep overscan ≥1.18 so it never reveals an edge. Verify
  edges: corner row/col `maxima` == 0 means a black reveal; >0 is real (dark) content.
- `drive-run` client times out ~300s on long renders (undici headers, not a failure) → render directly.
  Don't double-background (`&` + run_in_background) — you lose the completion signal.
- macOS: no `timeout`; `node --env-file=.env` for scripts needing keys; `npx tsx`.
- zsh does NOT word-split unquoted vars — use arrays in loops (`items=(...)`), not `for x in $str`.
- Big test renders gitignored: `public/effects-test/`, `public/depth-test/` (+ the ~9GB tts venv).
- Lottie assets: download-verified ≠ content-verified — RENDER and eyeball before trusting.
- `background-clip:text` breaks under 3D transforms in headless Chrome (use solid color + textShadow).

## User preferences
- Always state the exact save path + localhost URL for any generated file; never leave in /tmp.
- Wants video to POP — strong visible motion, physics, motion graphics; "not a fake video." Showcase
  may use any palette (not brand-locked) to demonstrate range.
- Free everything (no paid AI video, no per-char TTS). Paid Segmind FLUX-Fill reserved (see above).
- Always create a PR; never push to main directly.

## PENDING / next steps
1. **Outro polish**: beveled-metal wordmark + support a logo PNG.
2. **Volumetric parallax** (optional, larger): multi-slice depth layers for true 3D camera moves.
3. **Phase 2 — content-intelligence + analytics/MCP** (planned, not started): free trend extraction,
   Meta MCP, an MCP over the user's EXISTING live analytics (page visits/drop-off) for data-driven
   content. User confirmed video-first, this next.
