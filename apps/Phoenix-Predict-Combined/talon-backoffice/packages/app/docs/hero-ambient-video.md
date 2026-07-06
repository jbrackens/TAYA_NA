# Hero ambient video — direction brief & activation

## Current asset (shipped 2026-07-06)

`public/brand/hero-ambient.mp4` — 1920×1080, 4.25s seamless loop, 621KB. Scene:
silhouetted crowd from behind, arms raised, floodlit barangay basketball court,
drifting haze. Pipeline: FLUX.1-Krea-dev still (Space
`mcp-tools/FLUX.1-Krea-dev`) → Wan 2.2 14B image-to-video (Space
`zerogpu-aoti/wan2-2-fp8da-aoti-faster`) → ffmpeg grade (desat 18%, crushed
blacks, lanczos 1080p, temporal grain) → head-over-tail crossfade loop. Passed
the frame gate below (every frame reviewed; two sibling candidates rejected:
garbled signage in one, a hallucinated player popping in mid-clip in the other).
Activated in the demo deploy via `NEXT_PUBLIC_HERO_AMBIENT_VIDEO` build-arg in
deploy-demo.yml.

**License note:** Wan 2.2 is Apache-2.0 (outputs unrestricted). The still came
from FLUX.1-**Krea-dev**, which ships under the FLUX.1-dev Non-Commercial
License — BFL's terms permit broad use of _outputs_, but verify the current
Krea/BFL output terms before using this asset in real-money launch marketing
(fine for the demo). Regenerating the still with FLUX.1-schnell (Apache-2.0) is
the clean alternative if needed.

The landing hero is a drawn composition (chart-paper grid + YES/NO price paths).
An optional footage layer can sit _behind_ the scrim as atmosphere. The product
layer (chart, quotes, headline) always stays code-drawn on top — footage is
texture, never message. This split is deliberate: generated or stock footage can
carry subtle artifacts, but at −z-40 under an 88→12% black scrim at 26% opacity,
none of that survives to the reader; meanwhile every pixel that makes a product
claim remains deterministic.

## Activation

1. Drop the final clip at `public/brand/hero-ambient.mp4` (or any path under
   `public/`).
2. Set the build-time env/build-arg:
   `NEXT_PUBLIC_HERO_AMBIENT_VIDEO=/brand/hero-ambient.mp4`
3. Rebuild. Unset (default) renders no `<video>` element at all.

The layer self-disables under `prefers-reduced-motion` and before hydration, so
the drawn hero is also the no-JS / a11y / slow-connection fallback.

## One-command generation (Veo / Gemini API)

```sh
GEMINI_API_KEY=... ./scripts/hero-ambient-generate.sh
```

Launches the three scene candidates below on `veo-3.1-fast-generate-preview`,
polls, downloads, and emits frame contact sheets for the QA gate. Veo has **no
free-tier quota** — the key's Google Cloud project must have billing enabled
(immediate 429 RESOURCE_EXHAUSTED on `predictLongRunning` while text models work
= free tier). Never commit the key.

## Generation brief (Veo 3.1 / Seedance 2.0 / Kling 2.x)

**Scenes** (generate 4–6s each, pick 1 or stitch 2–3 with cross-fades):

- Barangay basketball crowd mid-reaction — a shot drops, arms up, mid-shot from
  behind the crowd.
- Billiard hall at night, break shot under string lights, shallow focus.
- Friends around a phone at a street-food stall reacting to a result — the phone
  faces AWAY from camera.
- Pageant watch-party cheer, TV glow only as out-of-focus bokeh.

**Hard constraints (these are what made the old clip read as slop):**

- NO readable text anywhere: no signage, no jersey lettering, no menus.
- NO visible screens/UI: phones and TVs face away or stay as bokeh.
- No close-up faces — mid-shots, backs, silhouettes (also avoids the
  uncanny-face tell and likeness questions).
- Handheld feel, shallow depth of field, natural motion cadence.

**Grade:** crush blacks toward `#050706`, desaturate ~20%, one warm practical
light source. It must sit under a heavy black scrim without banding — check the
darkest 10% of the histogram.

**Loop:** request a seamless loop, or generate 10s and cross-fade at the
midpoint. Target: 1080p+, H.264, 8–12s, ≤2.5MB (two-pass,
`-crf 26 -preset slow`, no audio track: `-an`).

## QA gate before merging (frame-by-frame)

```sh
mkdir -p /tmp/hero-frames && ffmpeg -i hero-ambient.mp4 -vf fps=4 /tmp/hero-frames/f%03d.png
```

Review every extracted frame for: rendered text/glyph garbage, extra or fused
fingers/limbs, objects popping in/out, physics glitches at the loop seam. One
bad frame fails the asset — the X audience screenshots single frames. Then
verify in-page at 26% opacity under the scrim: the footage should read as
movement and warmth, not as content you can narrate.
