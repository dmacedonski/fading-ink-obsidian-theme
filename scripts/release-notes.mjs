/**
 * Prints the CHANGELOG.md entry of a version without its heading, used as
 * the notes of the GitHub release. Fails when the version has no entry, so
 * a release can't go out without one.
 *
 * Usage: `$ node scripts/release-notes.mjs 0.1.0`
 */

import { readFileSync } from "fs";

const CHANGELOG = "CHANGELOG.md";

// Tags may have a "v" prefix, changelog versions don't
const version = process.argv[2]?.replace(/^v/, "");
if (!version) {
  console.error("Usage: node scripts/release-notes.mjs <version>");
  process.exit(1);
}

const lines = readFileSync(CHANGELOG, "utf8").split("\n");

// Release headings: "## [0.1.0] - 2026-10-16", the version may be unlinked
const RELEASE_HEADING = /^## \[?([^\]\s]+)\]? - /;

const start = lines.findIndex(
  (line) => line.match(RELEASE_HEADING)?.[1] === version,
);
if (start === -1) {
  console.error(`${CHANGELOG}: no entry for version ${version}`);
  process.exit(1);
}

// The entry ends at the next release or at the link definitions at the end
let end = lines.findIndex(
  (line, index) =>
    index > start && (line.startsWith("## ") || /^\[[^\]]+\]: /.test(line)),
);
if (end === -1) {
  end = lines.length;
}

const entry = lines.slice(start + 1, end).join("\n");
console.log(entry.trim());
