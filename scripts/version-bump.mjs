/**
 * Writes the new version from package.json to manifest.json and adds it to
 * versions.json, with the minimum Obsidian version from the manifest. Runs as
 * the "version" script of `npm version`, which then stages both files (it
 * doesn't commit or tag, see .npmrc).
 *
 * Usage: `$ npm version minor` (or major, patch)
 */

import { readFileSync, writeFileSync } from "fs";

const version = process.env.npm_package_version;
if (!version) {
  console.error("Run through npm version, e.g. `npm version minor`");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.version = version;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 4) + "\n");

// Obsidian installs the newest version whose minimum app version it meets
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[version] = manifest.minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 4) + "\n");
