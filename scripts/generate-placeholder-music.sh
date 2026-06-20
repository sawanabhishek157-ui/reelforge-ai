#!/usr/bin/env bash
# Generate the 7 placeholder ambient mood tracks for ReelForge V0.
# These are pure synthesised sine-wave chords — they're not "real" music but
# they're public-domain (we made them) and good enough to demonstrate the
# voice + music mixing in the V0 wizard.
#
# Replace any of these with real royalty-free tracks from:
#   - https://pixabay.com/music/    (CC0)
#   - https://uppbeat.io/           (free tier)
#   - https://incompetech.com/      (CC-BY)
# by simply overwriting public/music/<mood>.mp3.

set -e
cd "$(dirname "$0")/.."
cd public/music

gen() {
  local name="$1"
  local effects="$2"
  shift 2
  local in_args=""
  local maps=""
  local i=0
  for f in "$@"; do
    in_args="$in_args -f lavfi -i sine=frequency=${f}:sample_rate=44100"
    maps="$maps[${i}:a]"
    i=$((i+1))
  done
  ffmpeg -y $in_args -filter_complex "${maps}amix=inputs=${i}:normalize=0,${effects}" \
    -t 30 -c:a libmp3lame -b:a 128k "$name.mp3"
}

gen mysterious "volume=0.35,aecho=0.6:0.6:1000:0.3" 110 164.81
gen romantic   "volume=0.3,tremolo=f=3:d=0.2"        261.63 329.63 392.0
gen exciting   "volume=0.3,tremolo=f=4:d=0.4"        440 554.37 659.25
gen calm       "volume=0.25,aecho=0.5:0.5:1500:0.4"  220 329.63
gen dramatic   "volume=0.32"                          146.83 174.61 220
gen uplifting  "volume=0.28"                          523.25 659.25 783.99
gen epic       "volume=0.4,aecho=0.8:0.9:1200:0.5"   65.41 98 130.81

echo "Done. Files in public/music/:"
ls -lh *.mp3
