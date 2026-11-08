// Original 5 × 7 rounded pixel numerals. Not needed for a normal production rebuild.
// npm exec --yes --package=opentype.js@1.3.4 --package=wawoff2@2.0.1 -c 'node scripts/generate-font.mjs "$(dirname "$(command -v woff2_compress.js)")/.."'
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const modules = resolve(process.argv[2] ?? "node_modules");
const opentype = require(resolve(modules, "opentype.js"));
const woff = require(resolve(modules, "wawoff2"));
const pixels = {
  0: ["01110", "11011", "11011", "11011", "11011", "11011", "01110"],
  1: ["00110", "01110", "00110", "00110", "00110", "00110", "01111"],
  2: ["01110", "11011", "00011", "00110", "01100", "11000", "11111"],
  3: ["11110", "00011", "00011", "01110", "00011", "00011", "11110"],
  4: ["00011", "00111", "01111", "11011", "11111", "00011", "00011"],
  5: ["11111", "11000", "11000", "11110", "00011", "11011", "01110"],
  6: ["01110", "11000", "11000", "11110", "11011", "11011", "01110"],
  7: ["11111", "00011", "00011", "00110", "01100", "01100", "01100"],
  8: ["01110", "11011", "11011", "01110", "11011", "11011", "01110"],
  9: ["01110", "11011", "11011", "01111", "00011", "00011", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00110", "00100"],
  ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "/": ["00001", "00011", "00110", "00100", "01100", "11000", "10000"],
  "%": ["11001", "11011", "00010", "00100", "01000", "11011", "10011"],
};
const glyphs = [
  new opentype.Glyph({
    name: ".notdef",
    unicode: 0,
    advanceWidth: 620,
    path: new opentype.Path(),
  }),
];
for (const [char, rows] of Object.entries(pixels)) {
  const path = new opentype.Path();
  rows.forEach((row, y) =>
    [...row].forEach((pixel, x) => {
      if (pixel === "0") return;
      const left = 40 + x * 104,
        bottom = 58 + (6 - y) * 104,
        right = left + 100,
        top = bottom + 100,
        r = 10;
      path.moveTo(left + r, bottom);
      path.lineTo(right - r, bottom);
      path.quadTo(right, bottom, right, bottom + r);
      path.lineTo(right, top - r);
      path.quadTo(right, top, right - r, top);
      path.lineTo(left + r, top);
      path.quadTo(left, top, left, top - r);
      path.lineTo(left, bottom + r);
      path.quadTo(left, bottom, left + r, bottom);
      path.close();
    }),
  );
  glyphs.push(
    new opentype.Glyph({
      name: `uni${char.charCodeAt(0).toString(16)}`,
      unicode: char.charCodeAt(0),
      advanceWidth: 620,
      path,
    }),
  );
}
const font = new opentype.Font({
  familyName: "Wheel Bits",
  styleName: "Regular",
  unitsPerEm: 1000,
  ascender: 850,
  descender: -150,
  glyphs,
  manufacturer: "Wheel Cheer",
  designer: "Wheel Cheer contributors",
  license: "Original artwork; MIT license.",
});
font.createdTimestamp = 1794096000;
await writeFile(
  "src/wheel-bits.woff2",
  await woff.compress(Buffer.from(font.toArrayBuffer())),
);
console.log("Generated original Wheel Bits numerals.");
