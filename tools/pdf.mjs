/**
 * Checks the PDF export in the PDF viewers it's been tested in, one PNG per
 * page each: GNOME's document viewer, which draws with Cairo (pdftocairo),
 * and ONLYOFFICE (its converter, run from the Flatpak). They fail
 * differently on masks, blending and gradients into transparency.
 *
 * Given a PDF, e.g. exported from the test vault, it renders that. Given an
 * HTML fragment, the blocks of a note as the export has them (copied from
 * the app, every block in a div), it first prints them in headless Chrome
 * the way the export does: inside body.theme-light > div.print >
 * div.markdown-preview-view, with Obsidian's app.css, which it takes from
 * the running app (see `css` in tools/app.mjs), and the built theme.css, or
 * another one given with --theme. Elements with a data-p attribute get their content wrapped
 * in a <p> after loading, for embeds, which HTML can't nest in paragraphs.
 *
 * Usage: $ node tools/pdf.mjs <file.pdf|fragment.html> [--theme theme.css]
 *          [--dpi 110]
 *   writes .work/pdf/<name>/: export.pdf (from a fragment), gnome-1.png…
 *   and onlyoffice-1.png… (always at 96 dpi, ONLYOFFICE ignores the size)
 */

import { execFileSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";
import { basename, extname, join, relative, resolve } from "path";
import { pathToFileURL } from "url";
import { parseArgs } from "util";

const CHROME = process.env.CHROME ?? "google-chrome";
const ONLYOFFICE = "org.onlyoffice.desktopeditors";
const X2T = "/app/bin/opt/onlyoffice/desktopeditors/converter/x2t";

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    theme: { type: "string", default: "theme.css" },
    dpi: { type: "string", default: "110" },
  },
});
const [input] = positionals;
if (!input) {
  console.error("Usage: node tools/pdf.mjs <file.pdf|fragment.html>");
  process.exit(1);
}

const out = resolve(join(".work/pdf", basename(input, extname(input))));
mkdirSync(out, { recursive: true });

// Prints the fragment like the export, returns the PDF
function print(fragment) {
  if (!existsSync(options.theme)) {
    throw new Error(`${options.theme} is missing, run \`npm run build\` first`);
  }
  // Saved again every time, so it's the one of the Obsidian in use
  const appCss = execFileSync("node", ["tools/app.mjs", "css"], {
    encoding: "utf8",
  }).trim();
  const page = join(out, "export.html");
  writeFileSync(
    page,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${pathToFileURL(resolve(appCss))}">
<link rel="stylesheet" href="${pathToFileURL(resolve(options.theme))}">
</head>
<body class="theme-light">
<div class="print"><div class="markdown-preview-view markdown-rendered">
${readFileSync(fragment, "utf8")}
</div></div>
<script>
  for (const host of document.querySelectorAll("[data-p]")) {
    const p = document.createElement("p");
    p.append(...host.childNodes);
    host.append(p);
  }
</script>
</body>
</html>
`,
  );
  const pdf = join(out, "export.pdf");
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--virtual-time-budget=3000",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdf}`,
      pathToFileURL(page).href,
    ],
    { stdio: "ignore" },
  );
  return pdf;
}

const pdf = extname(input) === ".pdf" ? resolve(input) : print(input);

// GNOME's document viewer
execFileSync("pdftocairo", [
  "-png",
  "-r",
  options.dpi,
  pdf,
  join(out, "gnome"),
]);

// ONLYOFFICE renders thumbnails of every page (first=false) into a zip
const temp = mkdtempSync(join(out, ".onlyoffice-"));
writeFileSync(
  join(temp, "params.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<TaskQueueDataConvert>
<m_sFileFrom>${pdf}</m_sFileFrom>
<m_sFileTo>${join(temp, "pages.zip")}</m_sFileTo>
<m_nFormatTo>1029</m_nFormatTo>
<m_oThumbnail><format>4</format><aspect>2</aspect><first>false</first></m_oThumbnail>
</TaskQueueDataConvert>
`,
);
execFileSync("flatpak", [
  "run",
  `--command=${X2T}`,
  ONLYOFFICE,
  join(temp, "params.xml"),
]);
execFileSync("unzip", ["-q", "-o", join(temp, "pages.zip"), "-d", temp]);
for (const name of readdirSync(temp)) {
  const page = name.match(/^image(\d+)\.png$/);
  if (page) {
    renameSync(join(temp, name), join(out, `onlyoffice-${page[1]}.png`));
  }
}
rmSync(temp, { recursive: true });

console.log(relative(".", out));
for (const name of readdirSync(out).sort()) {
  console.log("  " + name);
}
