# Fading Ink

Obsidian theme by Damian Macedoński. The look: handwritten notes on paper, ink that fades. Version 0.1.0 styles note content (reading view and Live Preview); next is 0.2.0 with the theme's own color palette and the interface, until then Obsidian's default colors are used.

## Working with the user

- Talk to the user in Polish. Code, comments, commit messages, README and CHANGELOG are in English.
- The user commits and pushes. Commit only when asked, on the current branch (`develop`), with the user's message style: short past tense, e.g. "Added tags style".
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
- Lint baseline: 5 errors for `.HyperMD-*` classes (kebab-case rule, unavoidable for Live Preview) and 10 warnings, all false positives (`clip-path`, `text-decoration-*`, `break-*` "partially supported", one `!important` that overrides Obsidian's own). Anything beyond that is new.

## CSS conventions

- Prefer Obsidian's CSS variables; set them in the `body` block, grouped by element. Re-scope variables on elements instead of overriding properties where possible.
- Style both reading view (`.markdown-rendered`) and Live Preview (`.markdown-source-view.mod-cm6`), and say when something works in one mode only.
- Wrap hover rules in `@media (hover: hover)`, like Obsidian. Use logical properties and check RTL.
- Comments explain why, in full sentences, wrapped at 80 columns; formatting follows Prettier (single quotes in CSS).
- Lint workarounds that are fine: `:where()` to equalize specificity, `:is(hr)` to separate selectors for `no-descending-specificity`, `tbody:not(:empty)` instead of `:has()` (not allowed).

## Gotchas found so far

- Nested `&::before` in a rule with a selector list gets the specificity of the most specific selector in the list.
- Gradient positions don't accept 3-value syntax (`left 0.7em center` is invalid, `left 0.7em top 50%` works).
- Masks are positioned from the border box, backgrounds from the padding box.
- Live Preview splits formatted text into separate token spans (e.g. a highlight with bold inside), so per-element decorations show joins there.
- Obsidian's own checkbox tick is a mask on `::after`, reset it (`mask: none`) when drawing another shape.
- PDF export (`body.theme-light > div.print > div.markdown-preview-view.markdown-rendered`, every block wrapped in a `div`, `hr` not wrapped): no `.list-bullet` (the theme draws bullets on `li::before`), callouts are expanded, no `is-unresolved` on links.
- PDF viewers: gradients fading into transparency turn gray/black (GNOME, ONLYOFFICE), so fading lines use `var(--fade-into, transparent)` and the export sets `--fade-into` to the background; masks don't render in GNOME (use `clip-path: shape()` or paint instead); "darken" blending turns callouts gray in ONLYOFFICE.

## Testing

- Obsidian 1.14.4 (Chromium 150) is a Flatpak. Its CSS and JS for reference: extract `app.css`/`app.js` from `~/.var/app/md.obsidian.Obsidian/config/obsidian/obsidian-1.14.4.asar` (ASAR: header size at offset 4, JSON length at 12, JSON from 16, file offsets relative to 8 + header size).
- Mock pages for headless `google-chrome` load `app.css` and the built `theme.css`; reproduce Obsidian's DOM for the element. Override `body { contain: none; overflow: auto; position: static; height: auto }` and LP `.cm-content { width: auto }`. Use `--virtual-time-budget` so fonts load, `--dump-dom` with a script for computed styles, `--screenshot` (with `--force-device-scale-factor`) to look.
- Hover: copy the CSS with `:hover` replaced by a class, run Chrome with `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4` so `@media (hover: hover)` matches.
- PDF: `--print-to-pdf` with the export DOM, then render with `pdftocairo` (as GNOME's document viewer), `pdftoppm`, and ONLYOFFICE's converter: `flatpak run --command=/app/bin/opt/onlyoffice/desktopeditors/converter/x2t org.onlyoffice.desktopeditors params.xml` (thumbnail params with `<first>false</first>` render all pages to a zip of PNGs).
- `/tmp` gets cleaned from time to time, recreate test files and tools when they're gone.
- The user's vault is `~/Nextcloud/Notatki` (synced with Nextcloud); `.obsidian/themes/Fading Ink` links to this repository. The note `Fading Ink — notatka testowa.md` there contains every styled element; only use the vault's existing property names in it.

## Releases

git flow (`main`, `develop`, release branches, tags without a prefix); `.npmrc` sets `git-tag-version=false`, so `npm version` only bumps `package.json`, `manifest.json` and `versions.json`. Every release gets a `CHANGELOG.md` entry in the Common Changelog format (https://common-changelog.org), committed before the tag, with commit links on every line. Pushing the tag runs `.github/workflows/release.yml`, which builds the theme and creates a draft release with the changelog entry as notes.
