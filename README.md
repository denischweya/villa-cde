# Villa CDE website: V2 "Lake at dusk"

Static one-page site for Villa CDE, Moi South Lake Road, Naivasha. Plain HTML, CSS and vanilla JS: no build step, no dependencies.

## Run locally

```bash
cd villa-cde-v2
npx serve .            # or: python3 -m http.server 8000
```

You can also open `index.html` directly. Serving the folder is closer to production for the video and fonts.

## Structure

```
index.html              All markup (layout styles are inline, as exported from the design)
css/styles.css          Brand tokens (--night, --mist, --amber ...), tabs, hover and focus
                        states, the mobile nav panel, and the responsive @media blocks
js/main.js              Config, counters, hero video, mobile nav, amenity tabs, reviews
                        carousel, gallery lightbox, booking form with live price estimate
assets/img/             Photos (stills from the villa video), map.png, favicon.svg
assets/video/           villa-hero.webm   31.5 s muted loop, VP9, 1280x720   (preferred)
                        villa-hero.mp4    same loop, H.264 High, 1280x720    (fallback)
                        villa-hero-mobile.mp4  854x480 H.264, served under 700 px
```

## Settings (top of `js/main.js`)

| Key | What it does |
|---|---|
| `maxGuests` | "Max guests" counter and the guest field's max |
| `nightlyRate` | No longer shown on the page — only used to compute the estimate in the WhatsApp message sent to the villa owner |
| `currency` | Currency label used in that WhatsApp estimate line |

There's no Airbnb listing for this villa, so no Airbnb links appear anywhere
on the site. Pricing isn't shown publicly either; guests get a quote over
WhatsApp after submitting the booking form.

## Design tokens

- **Night** `#0E1726`: dark sections, text on light backgrounds
- **Mist** `#EEF1F3`: page background
- **Amber** `#F2A65A`: buttons and accents on dark backgrounds
- **Amber ink** `#B8651F`: accent text on light backgrounds (passes contrast)
- **Fonts:** Bricolage Grotesque for headings, Manrope for body text (Google Fonts)

## Placeholders to replace (search for `[`)

- **Reviews: the six quotes in `#reviews-track` are written samples, not real guests.**
  So are the `4.9` rating and the `38 reviews` count beside them. Replace all of it with
  verbatim quotes and the true figures from real guest reviews before the site goes live.
  There is a comment in the markup saying the same thing.
- Booking: check-in and check-out times, minimum stay, response time
- **Room names and bed types are working values.** The six cards in `#rooms` are named
  Garden / Corner / Study / Timber / Family / Twin, and each says "Double bed" or
  "Two single beds". Those were read off the video stills, not from the house — Twin,
  Study (shelving and a desk are visible) and Timber (carved headboard) are defensible;
  Corner and Family are guesses. Confirm all six against the real rooms.

## Contact details (live, in the footer)

| | |
|---|---|
| Phone / WhatsApp | +254 725 321433, +254 719 544188 |
| Email | villacdenvs@gmail.com |
| Instagram | [@villacde.ke](https://www.instagram.com/villacde.ke/) |

Cloudflare's **Email Address Obfuscation** (Scrape Shield) rewrites the `mailto:`
at the edge into `/cdn-cgi/l/email-protection` and decodes it with JavaScript in
the browser. The address renders and links correctly for visitors; it only looks
encoded if you `curl` the page or have JS disabled. Turn it off in the Cloudflare
dashboard under Scrape Shield if you want the raw address in the HTML.

## Booking form

The form is front end only — no backend. It validates the dates, shows the estimate, then hands the request to WhatsApp: `submitBooking()` in `js/main.js` opens `wa.me/<CONFIG.whatsappNumber>` with the booking details pre-filled as the message text, and the visitor taps send themselves. Change the recipient via `CONFIG.whatsappNumber` (digits only, no `+`). The payload includes `nights` and `estimate`.

## Notes

- **Map:** `assets/img/map.png` is an illustrated map that links to Google Maps search. To show a live map, swap in a Google Maps embed `<iframe>` that points at the exact pin.
- **Photos:** every image is a frame cut from the promo video. The source footage is
  1024×576 (WhatsApp-compressed), so that is the real detail ceiling. Each still is
  denoised (`nlmeans`), scaled to 1536×864 with lanczos and lightly sharpened, which
  removes the compression mush but cannot invent detail. **Replacing these with real
  photographs is the single biggest visual upgrade available to this site.** Keep the
  same file names and the markup needs no changes.
- **Regenerating the media:** both the stills and the hero loop are produced from the
  source video with ffmpeg. The timestamps used for each still, and the eight segments
  that make up the hero montage, are recorded in `docs/media-recipe.md`.
- **Accessibility:** the amenity tabs follow the WAI-ARIA tabs pattern, with arrow-key
  navigation. The lightbox and the mobile nav both support Esc, trap focus while open and
  return focus to whatever opened them.
- **Responsive:** the layout is tuned at 360, 390, 768 and 1024 px. Because the section
  layout lives in inline `style` attributes, the overrides in `css/styles.css` need
  `!important` to win on specificity — there is a comment in that block explaining why.
- **Known gaps:** `og:image` is a relative path and needs to be an absolute URL before
  social previews will work, and `assets/img/map.png` is still the illustrated placeholder.

## Deployment

Live at **https://villacde.swishfolio.com**.

Plain static files behind nginx, fronted by Cloudflare. The parent domain runs a
WordPress Multisite whose vhost claims `*.swishfolio.com`; an exact
`server_name villacde.swishfolio.com` takes precedence over that wildcard, so this
site does not touch multisite. TLS reuses a Cloudflare Origin wildcard certificate,
so there is no certbot renewal to track. DNS needed no change -- Cloudflare already
wildcards to the origin.

> Host, SSH user and absolute paths are deliberately **not** in this repository.
> They live in `docs/DEPLOY.local.md`, which is gitignored. The origin sits behind
> Cloudflare; publishing its address would defeat that.

Deploying is an rsync of `index.html`, `css/`, `js/` and `assets/` into the web
root, then a `chown` to the web user. Three things matter:

1. **Run `python3 scripts/bust-cache.py` first.** Skipping it ships new HTML
   against a month-old cached stylesheet.
2. **The remote rsync must run as root** (`--rsync-path="sudo rsync"`): the web
   root is owned by the web user, not the SSH user, so without it rsync fails
   part-way through on permissions.
3. **Read rsync's output.** It can fail per-file and still look fine if you pipe
   it through `grep`.

Never upload `README.md`, `docs/` or `scripts/`. The vhost denies `.md` and `.sh`,
but keeping them out of the web root is the real control.

### Cache busting (do not skip)

Assets are served `Cache-Control: public, immutable` for 30 days and cached at the
Cloudflare edge. Changing a file without changing its URL means visitors keep the
old copy for a month while getting the new HTML -- which breaks the page.
`scripts/bust-cache.py` appends `?v=<content-hash>` to every local asset reference
in `index.html`; the hash changes only when the bytes change, so running it twice
is a no-op. Run it before every deploy.

**Before this stops being a demo:** the vhost sends
`X-Robots-Tag: noindex, nofollow, noarchive` on every response, because the guest
reviews are written samples and the 4.9 / 38 figures are invented. Replace them
with real guest content, then drop the `X-Robots-Tag` lines from the vhost and
reload nginx.
