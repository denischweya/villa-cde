# Media recipe

Every image and the hero loop are generated from one source file:

```
WhatsApp Video 2026-10-16 at 15.42.24.mp4
1024x576 · H.264 Baseline · ~895 kbps video · 257.2 s · 30 fps
```

**That resolution is the ceiling.** The file has already been through WhatsApp's
compressor, so no amount of processing recovers detail that is not in it. If the
original camera/drone footage still exists, re-run everything below against it and
raise the output sizes — that is the one change that materially improves this site.

## Things to avoid in the source

Three burned-in captions and one blown-out transition. Do not cut stills or clips
from these windows:

| Window | What is there |
|---|---|
| 1.8 s – 7.5 s | "VILLA CDE" title caption |
| 193 s – 197 s | "LAKE NAIVASHA" caption |
| ~200 s | washed-out white transition frame |
| 246 s – 257 s | "VILLA CDE" and PichaClear outro cards |

## Stills

Filter chain, applied to every still:

```
nlmeans=s=1.0:p=5:r=11,scale=1536:864:flags=lanczos+accurate_rnd,unsharp=5:5:0.6:5:5:0.0
```

`nlmeans` at `s=1.0` clears the compression mosquito noise while leaving grass and
foliage their texture (`s=1.8` was tried and made them look plasticky). Output is
JPEG `-q:v 3`, ~45–160 KB each.

```bash
ffmpeg -ss <t> -i "$SRC" -frames:v 1 -vf "<chain>" -q:v 3 assets/img/<name>.jpg
```

| File | t (s) | File | t (s) |
|---|---|---|---|
| aerial-pool | 236.0 | kitchen | 86.0 |
| aerial-wide | 1.0 | living | 60.0 |
| art | 72.0 | lounge-library | 169.5 |
| bath | 100.5 | night | 243.0 |
| bed-blue | 130.0 | pool-aerial | 199.0 |
| bed-cream | 121.5 | bed-timber | 127.0 |
| wardrobe | 104.0 | | |
| bed-green | 93.0 | pool-deck | 202.5 |
| bed-red | 157.0 | pool-front | 8.0 |
| chairs | 232.0 | rooftop | 187.0 |
| chef-table | 81.5 | rooftop-lounge | 190.0 |
| dining | 209.5 | shower | 138.0 |
| exterior-day | 179.5 | towel | 109.0 |
| firepit | 213.0 | twin-room | 145.0 |
| fountain | 21.0 | | |

The best food moment in the source (81.5 s) was cut and then dropped: the dishes are
covered and it reads as a hotel buffet rather than a private chef. Re-cut it with the
chain above if you disagree, or shoot a real plated meal.

`pool-front.jpg` is cut at 8.0 s on purpose: it is the video poster, and 8.0 s is the
hero montage's first frame, so the poster and the first frame of video match exactly
and there is no jump when playback starts.

## Hero loop

Eight segments, 0.5 s crossfades, 31.5 s total.

```bash
scripts/build-hero.sh "/path/to/WhatsApp Video 2026-10-16 at 15.42.24.mp4"
```

| # | Source in | Length | Shot |
|---|---|---|---|
| 1 | 8.0 | 4.5 | pool and villa |
| 2 | 13.5 | 4.0 | rooftop, orange umbrella |
| 3 | 186.5 | 4.5 | rooftop lounge and view |
| 4 | 201.5 | 4.0 | pool deck, then straight down |
| 5 | 211.0 | 4.5 | teak table, then the fire pit |
| 6 | 228.0 | 4.5 | aerial over the grounds |
| 7 | 233.5 | 4.5 | aerial, pool and fire pit |
| 8 | 241.0 | 4.5 | dusk into night, pool lit |

Per-clip chain: `hqdn3d=2:1.5:3:3,scale=1280:720:flags=lanczos,unsharp=5:5:0.45:5:5:0.0,fps=30`

There is a 0.8 s fade to black at the end and **no** fade in. That is deliberate: the
poster is the first frame, so fading in would flash the poster to black on load, while
fading out gives the loop a clean black-to-bright restart instead of a night-to-day cut.

Encodes (no audio — the hero is muted):

| Output | Encoder | Setting | Result |
|---|---|---|---|
| villa-hero.webm | libvpx-vp9 | `-crf 39 -b:v 0 -row-mt 1 -cpu-used 2` | 1336 kbps · 5.0 MB |
| villa-hero.mp4 | libx264 | `-crf 25 -preset slow -profile:v high` | 1741 kbps · 6.5 MB |
| villa-hero-mobile.mp4 | libx264 | `-crf 25 -preset slow`, scaled 854x480 | 955 kbps · 3.6 MB |

Bitrates are deliberately capped near the source's own density (~0.05 bits/pixel/frame).
CRF 19 was tried first and produced a 14 MB file that was spending its extra bits
re-encoding the source's own artifacts, not adding detail.
