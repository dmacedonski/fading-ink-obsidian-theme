# Fading Ink

An [Obsidian](https://obsidian.md) theme inspired by handwritten notes on paper. Headings and italics are set in a handwritten font, the text in a calm book serif, and the details are drawn with a pen: underlines that fade out, a hand-drawn tick, a quotation mark made of ink drops and highlights that look like strokes of a highlighter.

The colors come from paper and iron gall ink: cream paper with a subtle texture and brown-black text in light mode, dark paper with light ink in dark mode, a sepia accent (an accent chosen in Obsidian's appearance settings still takes precedence) and historic pigments for callouts, highlights and code. The interface is toned to match, down to tooltips and shadows. PDF exports are printed on white paper.

What each version brings is listed in the [changelog](CHANGELOG.md).

## Installation

Until the theme is available in Obsidian's community themes:

1. Download `theme.css` and `manifest.json` from the [latest release](https://github.com/dmacedonski/fading-ink-obsidian-theme/releases/latest).
2. Put them in a `Fading Ink` folder inside your vault's themes folder: `<vault>/.obsidian/themes/Fading Ink/`.
3. Choose **Fading Ink** in **Settings → Appearance → Themes**.

The theme sets the text in Lora, which can still be replaced in **Settings → Appearance → Font**.

Requires Obsidian 1.14.4 or newer.

## Known limitations

- List bullets have a style for each of the first three levels. In reading view the deeper levels keep the style of the third, in Live Preview the styles start over from the fourth level.
- In reading view, the strikethrough line of a sentence with italics isn't straight: it runs higher over the italic words, which are set in the handwritten font.
- Highlights look like strokes of a highlighter in reading view only. Live Preview splits formatted text into separate pieces, so highlights stay flat there.
- The line under a heading follows its text, but a heading that wraps onto more lines is underlined across the whole column.
- The note title above the content is only as wide as its text, so clicking to edit it works on the text, not anywhere in its row.

## Development

The theme is written in `src/theme.css`. The build embeds the fonts from `fonts/` in `theme.css`, converted to WOFF2, since Obsidian themes can't load files from disk.

```bash
npm ci          # install the dependencies
npm run build   # build theme.css once
npm run dev     # rebuild after every change in src/ or fonts/
npm run lint    # check src/ with stylelint
```

To work on the theme, link the repository folder into your vault's themes folder as `Fading Ink`.

### Releases

Releases follow git flow. `npm version` only bumps the version in `package.json`, `manifest.json` and `versions.json` (see `.npmrc`), git flow makes the merge and the tag. The release gets an entry in [CHANGELOG.md](CHANGELOG.md), written in the [Common Changelog](https://common-changelog.org) format and committed before the tag:

```bash
git flow release start 0.2.0
npm version minor
# Add the 0.2.0 entry to CHANGELOG.md
git commit -am "Bumped version to 0.2.0"
git flow release finish -m "0.2.0" 0.2.0
git push origin main develop 0.2.0
```

Pushing the tag builds the theme and creates a draft release on GitHub with `theme.css` and `manifest.json`.

## Licenses

The theme is released under the [MIT License](LICENSE).

The fonts are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org) and embedded unmodified, only converted to WOFF2:

- Dancing Script by Impallari Type, copyright 2016 The Dancing Script Project Authors, with Reserved Font Name "Dancing Script" ([license](fonts/OFL.txt)).
- Lora by Cyreal, copyright 2011 The Lora Project Authors, with Reserved Font Name "Lora" ([license](fonts/OFL-Lora.txt)).

The external link icon comes from [Lucide](https://lucide.dev) (ISC License).
