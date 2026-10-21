#!/bin/bash
#
# Rebuild the hero loop from the source promo video.
#
#   usage: scripts/build-hero.sh /path/to/source.mp4
#
# Writes villa-hero.webm, villa-hero.mp4 and villa-hero-mobile.mp4 into
# assets/video/. Requires ffmpeg. See docs/media-recipe.md for why each clip,
# filter and bitrate was chosen, and for the caption windows to avoid in the
# source footage.
set -euo pipefail

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "usage: $0 /path/to/source.mp4" >&2
  exit 1
fi
command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/video"
mkdir -p "$OUT"

# clip start:duration  (all verified free of burned-in captions)
CLIPS=( "8.0:4.5" "13.5:4.0" "186.5:4.5" "201.5:4.0" "211.0:4.5" "228.0:4.5" "233.5:4.5" "241.0:4.5" )
XF=0.5

# per-clip: temporal+spatial denoise, upscale 1.25x lanczos, mild sharpen, uniform fps/SAR
PRE="hqdn3d=2:1.5:3:3,scale=1280:720:flags=lanczos+accurate_rnd,unsharp=5:5:0.45:5:5:0.0,fps=30,format=yuv420p,setsar=1"

inputs=(); filter=""
for i in "${!CLIPS[@]}"; do
  s="${CLIPS[$i]%%:*}"; d="${CLIPS[$i]##*:}"
  inputs+=( -ss "$s" -t "$d" -i "$SRC" )
  filter+="[$i:v]${PRE}[v$i];"
done

# chain the crossfades, accumulating the offset
prev="[v0]"; len=$(awk -v d="${CLIPS[0]##*:}" 'BEGIN{print d}')
for i in $(seq 1 $((${#CLIPS[@]}-1))); do
  d="${CLIPS[$i]##*:}"
  off=$(awk -v l="$len" -v t="$XF" 'BEGIN{printf "%.3f", l-t}')
  out="[x$i]"
  filter+="${prev}[v$i]xfade=transition=fade:duration=${XF}:offset=${off}${out};"
  prev="$out"
  len=$(awk -v l="$len" -v d="$d" -v t="$XF" 'BEGIN{printf "%.3f", l+d-t}')
done
# fade in/out so the loop point is black-to-black rather than a night->day jump
fo=$(awk -v l="$len" 'BEGIN{printf "%.3f", l-0.8}')
filter+="${prev}fade=t=out:st=${fo}:d=0.8[vout]"

echo "final duration: ${len}s"
echo "--- H.264 ---"
ffmpeg -y -v error "${inputs[@]}" -filter_complex "$filter" -map "[vout]" \
  -c:v libx264 -crf 25 -preset slow -profile:v high -level 4.0 -pix_fmt yuv420p \
  -g 60 -movflags +faststart -an "$OUT/villa-hero.mp4"
echo "--- VP9 ---"
ffmpeg -y -v error "${inputs[@]}" -filter_complex "$filter" -map "[vout]" \
  -c:v libvpx-vp9 -crf 39 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an "$OUT/villa-hero.webm"
echo done
echo "--- mobile 480p ---"
ffmpeg -y -v error "${inputs[@]}" -filter_complex "${filter%\[vout\]}[pv];[pv]scale=854:480:flags=lanczos[vout]" -map "[vout]" \
  -c:v libx264 -crf 25 -preset slow -profile:v main -level 3.1 -pix_fmt yuv420p \
  -g 60 -movflags +faststart -an "$OUT/villa-hero-mobile.mp4"
echo mobile done
