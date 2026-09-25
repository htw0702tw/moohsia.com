import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOfficialCatalog } from "../shared/aov-parse.js";

const target = path.resolve(import.meta.dirname, "../data/aov-catalog.json");
await mkdir(path.dirname(target), { recursive: true });
const catalog = await buildOfficialCatalog(fetch);
await writeFile(target, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`wrote ${catalog.heroes.length} heroes, ${catalog.modes.length} modes, ${catalog.activities.length} activities`);
