import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "out");

const sourceHtml = path.join(rootDir, "fedex-ship-auth.html");
const sourceFavicon = path.join(rootDir, "favicon.png");
const outputHtml = path.join(outDir, "index.html");
const outputFavicon = path.join(outDir, "favicon.png");

await mkdir(outDir, { recursive: true });

const html = await readFile(sourceHtml, "utf8");
await writeFile(outputHtml, html, "utf8");
await copyFile(sourceFavicon, outputFavicon);

console.log(`Built frontend export at ${outDir}`);
