/**
 * Converts TrueType and OpenType fonts to WOFF2 using the Brotli compression
 * built into Node.js, so no font tools are needed. Every table is stored as
 * it is (WOFF2's "null transform"), only the container changes: the font
 * data stays byte for byte the same, which keeps the conversion a change of
 * format only. Specification: https://www.w3.org/TR/WOFF2/
 */

import { brotliCompressSync, constants } from "zlib";

// Tables with an index in this list are stored by index instead of by tag
// prettier-ignore
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ",
  "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp",
  "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF",
  "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL",
  "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc",
  "feat", "fmtx", "fvar", "gvar", "hsty", "just", "lcar", "mort", "morx",
  "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
];

// Transform version meaning "stored as is": 3 for glyf and loca (where 0
// means transformed), 0 for every other table
const NULL_TRANSFORM = { glyf: 3, loca: 3 };

const HEADER_SIZE = 48;

const round4 = (value) => (value + 3) & ~3;

// Variable-length unsigned integer, 7 bits per byte, most significant first
function uintBase128(value) {
  const bytes = [value & 0x7f];
  while ((value >>>= 7) > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
  }
  return bytes;
}

export function sfntToWoff2(font) {
  const flavor = font.readUInt32BE(0);
  if (flavor !== 0x00010000 && flavor !== 0x4f54544f /* OTTO */) {
    throw new Error(
      "not a TrueType or OpenType font (collections aren't supported)",
    );
  }

  const tables = [];
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const entry = 12 + 16 * i;
    const offset = font.readUInt32BE(entry + 8);
    const length = font.readUInt32BE(entry + 12);
    tables.push({
      tag: font.toString("latin1", entry, entry + 4),
      data: font.subarray(offset, offset + length),
    });
  }

  const directory = [];
  for (const { tag, data } of tables) {
    // Flags: the transform version in the top 2 bits, the known table index
    // (or 63 when the tag follows) in the rest
    const index = KNOWN_TAGS.indexOf(tag);
    const transform = NULL_TRANSFORM[tag] ?? 0;
    directory.push((transform << 6) | (index === -1 ? 63 : index));
    if (index === -1) {
      directory.push(...Buffer.from(tag, "latin1"));
    }
    directory.push(...uintBase128(data.length));
  }

  const tableData = Buffer.concat(tables.map(({ data }) => data));
  const compressed = brotliCompressSync(tableData, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_FONT,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: tableData.length,
    },
  });

  // Size of the decoded font: its header, table directory and padded tables
  const sfntSize = tables.reduce(
    (size, { data }) => size + round4(data.length),
    12 + 16 * tables.length,
  );
  const head = tables.find(({ tag }) => tag === "head")?.data;
  const dataOffset = HEADER_SIZE + directory.length;
  const length = round4(dataOffset + compressed.length);

  const woff2 = Buffer.alloc(length);
  woff2.write("wOF2", 0, "latin1");
  woff2.writeUInt32BE(flavor, 4);
  woff2.writeUInt32BE(length, 8);
  woff2.writeUInt16BE(tables.length, 12);
  woff2.writeUInt32BE(sfntSize, 16);
  woff2.writeUInt32BE(compressed.length, 20);
  // The font version, taken from fontRevision in the head table. The
  // metadata and private data blocks (offsets 28-47) stay empty
  woff2.writeUInt16BE(head ? head.readUInt16BE(4) : 1, 24);
  woff2.writeUInt16BE(head ? head.readUInt16BE(6) : 0, 26);
  Buffer.from(directory).copy(woff2, HEADER_SIZE);
  compressed.copy(woff2, dataOffset);
  return woff2;
}
