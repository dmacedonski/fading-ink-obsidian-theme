# Fading Ink

Obsidian theme by Damian Macedoński. The look: handwritten notes on paper, ink that fades. Version 0.1.0 styled note content (reading view and Live Preview), 0.2.0 added the color palette (paper and iron gall ink, sepia accent, historic pigments), a paper texture and warm interface tones and shadows. Next, 0.3.0: smaller refinements.

## Working with the user

- Talk to the user in Polish. Code, comments, commit messages, README and CHANGELOG are in English.
- The user commits and pushes. Commit only when asked, on whatever branch is checked out (`develop`, or a `release/*` branch during a release), with the user's message style: short past tense, e.g. "Added tags style".
- Downloading anything (fonts, packages) needs explicit permission first: name the file, source and size.
- For design choices, propose variants with a recommendation and let the user pick. Don't force hacky solutions; say when something can't be done cleanly.
- Keep lint rules on, don't disable or work around them with comments.
- Verify every change before reporting it (see Testing), report lint results honestly.

## Project

- `src/theme.css`: the source, the only file to edit for styles. `theme.css` in the root is generated (gitignored) and is what Obsidian loads.
- `fonts/`: Dancing Script (headings, note title, italics, list numbers) and Lora (text), OFL with Reserved Font Names: format conversion is fine, no subsetting or other changes. License texts: `fonts/OFL.txt`, `fonts/OFL-Lora.txt`.
- `scripts/build.mjs`: embeds every relative `url()` as a data URL, converting TTF/OTF to WOFF2 with `scripts/woff2.mjs` (Brotli from Node, tables stored unchanged).
- `scripts/release-notes.mjs`: prints a version's CHANGELOG entry for the GitHub release.
- `npm run build`, `npm run dev` (watch), `npm run lint` (stylelint with stylelint-config-obsidianmd).
- Lint baseline: 2 errors for `.HyperMD-*` classes (kebab-case rule, unavoidable for Live Preview) and 11 warnings, all false positives (`clip-path`, `text-decoration-*`, `break-*` "partially supported", one `!important` that overrides Obsidian's own). Anything beyond that is new.

## CSS conventions

- Prefer Obsidian's CSS variables; set them in the `body` block, grouped by element. Re-scope variables on elements instead of overriding properties where possible.
- Colors live in the `.theme-light` and `.theme-dark` blocks after `body`: the `--color-base-00…100` scale (Obsidian derives backgrounds, borders and text from it), the accent as `--accent-h/s/l`, the pigments `--color-red…pink` with `-rgb` twins, interface tones (`--mono-100`, tooltips, notices, cover), `--shadow-rgb` and the paper texture layers. Check contrast when changing them (text ≥ 7:1, muted and accent ≥ 4.5:1).
- Style both reading view (`.markdown-rendered`) and Live Preview (`.markdown-source-view.mod-cm6`), and say when something works in one mode only.
- Wrap hover rules in `@media (hover: hover)`, like Obsidian. Use logical properties and check RTL.
- Comments explain why, in full sentences, wrapped at 80 columns; formatting follows Prettier (single quotes in CSS).
- Lint workarounds that are fine: `:where()` to equalize specificity, `:is(hr)` to separate selectors for `no-descending-specificity`, `tbody:not(:empty)` instead of `:has()` (not allowed).

## Gotchas found so far

- Nested `&::before` in a rule with a selector list gets the specificity of the most specific selector in the list.
- Gradient positions don't accept 3-value syntax (`left 0.7em center` is invalid, `left 0.7em top 50%` works).
- Masks are positioned from the border box, backgrounds from the padding box.
- Live Preview splits formatted text into separate token spans (e.g. a highlight with bold inside), so per-element decorations show joins there.
- Text direction is set per block: `dir="auto"` on headings in reading view, a `dir` attribute on every Live Preview line, so one note can mix directions. Obsidian sets `margin: 0 !important` on Live Preview lines (`.cm-content > *`); to place a narrowed block on its own start side use `justify-self: self-start` (block layout, Chromium 130+).
- `clip-path` on an inline element that breaks across lines clips it to its first line (tags get `white-space: nowrap`), and a clip edge exactly on the box edge is smoothed, which shows as a seam between adjacent spans (run straight cuts a pixel outside).
- Live Preview widgets (embeds, `.cm-content > [contenteditable=false]`) have `contain: paint !important`, so shadows and pseudo-elements must stay inside their box (the embed's paper is inset to leave room).
- Obsidian's own checkbox tick is a mask on `::after`, reset it (`mask: none`) when drawing another shape.
- PDF export (`body.theme-light > div.print > div.markdown-preview-view.markdown-rendered`, every block wrapped in a `div`, `hr` not wrapped): no `.list-bullet` (the theme draws bullets on `li::before`), callouts are expanded, no `is-unresolved` on links.
- PDF viewers: gradients fading into transparency turn gray/black (GNOME, ONLYOFFICE), so fading lines use `var(--fade-into, transparent)` and the export sets `--fade-into` to the background; masks don't render in GNOME (use `clip-path: shape()` or paint instead); "darken" blending turns callouts gray in ONLYOFFICE.
- Chrome drops the hue of colors with an OKLCH chroma below 0.02 when mixing in OKLCH (they turn purplish). The palette's browns are that low, so mix them in sRGB; Obsidian's own OKLCH mixes get a slightly more saturated ink through `--mono-100`.
- SVG `feTurbulence` tiles only repeat seamlessly with `stitchTiles='stitch'` and the filter region set to the tile (`x='0' y='0' width='100%' height='100%'`, the default reaches 10% past it).
- The build embeds every relative `url()`; references inside SVG data URLs must be URL-encoded fragments (`url(%23id)`), which it skips like `#`.
- The paper texture is a background on the scrolling element of notes (`background-attachment: local`), so anything painting a flat `--background-primary` over it shows as a patch.

## Testing

- Obsidian 1.14.4 (Chromium 150) is a Flatpak. Its CSS and JS for reference: extract `app.css`/`app.js` from `~/.var/app/md.obsidian.Obsidian/config/obsidian/obsidian-1.14.4.asar` (ASAR: header size at offset 4, JSON length at 12, JSON from 16, file offsets relative to 8 + header size).
- Mock pages for headless `google-chrome` load `app.css` and the built `theme.css`; reproduce Obsidian's DOM for the element. Override `body { contain: none; overflow: auto; position: static; height: auto }` and LP `.cm-content { width: auto }`. Use `--virtual-time-budget` so fonts load, `--dump-dom` with a script for computed styles, `--screenshot` (with `--force-device-scale-factor`) to look.
- Interface: mock the workspace with Obsidian's classes (ribbon, `.workspace-split`, tab headers, file explorer tree, `.view-header`, `.status-bar`, `.modal`, `.prompt`, `.menu`, `.tooltip`, `.notice`) on `body.theme-* mod-linux is-frameless is-focused`, at window size.
- Hover: copy the CSS with `:hover` replaced by a class, run Chrome with `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4` so `@media (hover: hover)` matches.
- PDF: `--print-to-pdf` with the export DOM, then render with `pdftocairo` (as GNOME's document viewer), `pdftoppm`, and ONLYOFFICE's converter: `flatpak run --command=/app/bin/opt/onlyoffice/desktopeditors/converter/x2t org.onlyoffice.desktopeditors params.xml` (thumbnail params with `<first>false</first>` render all pages to a zip of PNGs).
- `/tmp` gets cleaned from time to time, recreate test files and tools when they're gone.
- The user's vault is `~/Nextcloud/Notatki` (synced with Nextcloud); `.obsidian/themes/Fading Ink` links to this repository. The note `Fading Ink — notatka testowa.md` there contains every styled element; only use the vault's existing property names in it.

## Releases

git flow (`main`, `develop`, release branches, tags without a prefix); `.npmrc` sets `git-tag-version=false`, so `npm version` only bumps `package.json`, `manifest.json` and `versions.json`. Every release gets a `CHANGELOG.md` entry in the Common Changelog format (https://common-changelog.org), committed before the tag, with commit links on every line. Pushing the tag runs `.github/workflows/release.yml`, which builds the theme and creates a draft release with the changelog entry as notes.
