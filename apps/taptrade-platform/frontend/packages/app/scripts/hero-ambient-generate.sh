#!/usr/bin/env bash
# Generate hero-ambient video candidates with Veo via the Gemini API,
# then build frame contact sheets for the QA gate in
# docs/hero-ambient-video.md. Requires: GEMINI_API_KEY env, curl, python3,
# ffmpeg. Veo has NO free-tier quota — the key's project needs billing.
#
#   GEMINI_API_KEY=$(secret GEMINI_API_KEY) ./scripts/hero-ambient-generate.sh [outdir] [model]
#
# Reference the key BY NAME, never paste the literal — a pasted key lands in
# shell history and in any transcript where the command is shared. Store it with
#   security add-generic-password -a "$USER" -s GEMINI_API_KEY -w   (prompts, no echo)
# See docs/hero-ambient-video.md.
#
# model defaults to veo-3.1-fast-generate-preview (good quality/cost for
# footage that lands at 26% opacity under a scrim). Note: the -lite tier
# rejects negativePrompt; constraints are baked into the prompts anyway.
set -euo pipefail

OUT="${1:-/tmp/hero-ambient-candidates}"
MODEL="${2:-veo-3.1-fast-generate-preview}"
API="https://generativelanguage.googleapis.com/v1beta"
: "${GEMINI_API_KEY:?set GEMINI_API_KEY}"
mkdir -p "$OUT"

NEG="readable text, letters, words, captions, subtitles, watermark, logo, signage, jersey lettering, storefront signs, visible phone screen, user interface, close-up face, direct eye contact"

declare -a SLUGS=(billiard basketball streetfood)
declare -a PROMPTS=(
"Handheld cinematic mid-shot inside a dim Filipino billiard hall at night. A pool break shot scatters the balls; silhouettes of onlookers lean in from the shadows behind the table. One warm practical lamp hangs over the table, string-light bokeh far in the background. Shallow depth of field, natural handheld sway, documentary feel, dark moody grade with crushed blacks, desaturated. No signage, no readable text anywhere, no screens, no close-up faces."
"Handheld documentary mid-shot from behind a standing crowd at a night-time barangay basketball court in the Philippines. The crowd reacts and raises arms as an unseen shot drops; floodlight glow with faint dust in the air. Backs and silhouettes only, plain unmarked clothing, shallow depth of field, dark cinematic grade with crushed blacks, one warm floodlight source. No signage, no readable text, no visible screens, no close-up faces."
"Cinematic handheld shot of a group of friends around a small table at a Filipino street-food stall at night, leaning in and reacting excitedly together. One person holds a phone facing away from the camera. A single warm tungsten bulb overhead, deep shadows, distant city-light bokeh, shallow depth of field, mid-shot from the side, documentary energy, crushed blacks, desaturated grade. No signage, no readable text, no visible screens, no close-up faces."
)

echo "== launching ${#SLUGS[@]} generations on $MODEL"
for i in "${!SLUGS[@]}"; do
  body=$(python3 - "$MODEL" "${PROMPTS[$i]}" "$NEG" <<'PY'
import json, sys
model, prompt, neg = sys.argv[1], sys.argv[2], sys.argv[3]
params = {"aspectRatio": "16:9", "resolution": "1080p", "durationSeconds": 8}
if "lite" not in model:
    params["negativePrompt"] = neg
print(json.dumps({"instances": [{"prompt": prompt}], "parameters": params}))
PY
)
  op=$(curl -sf -X POST "$API/models/$MODEL:predictLongRunning?key=$GEMINI_API_KEY" \
    -H "Content-Type: application/json" -d "$body" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])")
  echo "  ${SLUGS[$i]}: $op"
  echo "$op" > "$OUT/op-${SLUGS[$i]}.txt"
done

echo "== polling until done (Veo runs 1-6 min per clip)"
for slug in "${SLUGS[@]}"; do
  op=$(cat "$OUT/op-$slug.txt")
  for _ in $(seq 1 60); do
    resp=$(curl -sf "$API/$op?key=$GEMINI_API_KEY")
    done_flag=$(printf '%s' "$resp" | python3 -c "import json,sys; print(json.load(sys.stdin).get('done', False))")
    [ "$done_flag" = "True" ] && break
    sleep 10
  done
  uri=$(printf '%s' "$resp" | python3 -c "
import json, sys
d = json.load(sys.stdin)
r = d.get('response', {}).get('generateVideoResponse', {})
s = r.get('generatedSamples') or r.get('videos') or []
print(s[0]['video']['uri'] if s and 'video' in s[0] else s[0].get('uri', '') if s else '')
")
  if [ -z "$uri" ]; then
    echo "  $slug: FAILED"; printf '%s' "$resp" | head -c 400; echo; continue
  fi
  curl -sfL "$uri&key=$GEMINI_API_KEY" -o "$OUT/$slug.mp4" \
    || curl -sfL -H "x-goog-api-key: $GEMINI_API_KEY" "$uri" -o "$OUT/$slug.mp4"
  echo "  $slug: $(du -h "$OUT/$slug.mp4" | cut -f1)"
done

echo "== QA contact sheets (every frame at 4fps, 4x4 tiles)"
for slug in "${SLUGS[@]}"; do
  [ -f "$OUT/$slug.mp4" ] || continue
  ffmpeg -loglevel error -y -i "$OUT/$slug.mp4" -vf "fps=4,scale=480:-1,tile=4x4" "$OUT/$slug-sheet-%d.png"
done
echo "Review every sheet in $OUT per docs/hero-ambient-video.md — one bad frame fails the asset."
