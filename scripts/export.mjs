import { mkdir, readFile, writeFile } from "node:fs/promises";
const html = await readFile("dist/index.html", "utf8");
await mkdir("dist/overlay", { recursive: true });
await writeFile(
  "dist/overlay/index.html",
  html
    .replace('<html lang="en">', '<html lang="en" data-page="overlay">')
    .replaceAll('"./', '"../')
    .replace(
      "<title>Wheel Cheer · Your stream’s little sidekick</title>",
      "<title>Wheel Cheer · Stream overlay</title>",
    ),
);
console.log("Exported setup and overlay/index.html with relative assets.");
