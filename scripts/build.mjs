/**
 * Builds theme.css from src/theme.css. Obsidian themes can't load files from
 * disk, so every relative url() in the source (fonts, images) is embedded as
 * a base64 data URL. Paths are resolved relative to src/.
 *
 * Usage: `$ npm run build` builds once, `$ npm run dev` rebuilds after every
 * change in src/ or fonts/.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, extname, resolve } from "path";

const SOURCE = "src/theme.css";
const OUTPUT = "theme.css";

const MIME_TYPES = {
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const BANNER = `/* Generated from ${SOURCE} by scripts/build.mjs, don't edit this file */\n\n`;

// url('file'), url("file") or url(file), skipping data URLs, absolute paths,
// remote URLs (Obsidian blocks them anyway) and SVG fragment references
const RELATIVE_URL = /url\(\s*(['"]?)(?![a-z]+:|\/|#)([^'")]+)\1\s*\)/gi;

const source = readFileSync(SOURCE, "utf8");

let embedded = 0;
const output = source.replace(RELATIVE_URL, (match, quote, path) => {
  const mimeType = MIME_TYPES[extname(path).toLowerCase()];
  if (!mimeType) {
    throw new Error(`${SOURCE}: unsupported file type in ${match}`);
  }

  const data = readFileSync(resolve(dirname(SOURCE), path)).toString("base64");
  embedded++;
  return `url('data:${mimeType};base64,${data}')`;
});

writeFileSync(OUTPUT, BANNER + output);

const size = (Buffer.byteLength(BANNER + output) / 1024).toFixed(0);
console.log(`${OUTPUT}: ${embedded} file(s) embedded, ${size} KiB`);
