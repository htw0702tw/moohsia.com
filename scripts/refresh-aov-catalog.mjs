import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOfficialCatalog } from "../shared/aov-parse.js";

const target = path.resolve(import.meta.dirname, "../data/aov-catalog.json");
await mkdir(path.dirname(target), { recursive: true });
const catalog = await buildOfficialCatalog(fetch, new Date().toISOString(), { detailLimit: 1000, detailOffset: 0 });
await writeFile(target, `${JSON.stringify(catalog, null, 2)}\n`);
const skins = catalog.heroes.reduce((sum, hero) => sum + (hero.skins?.length || 0), 0);
console.log(
  `wrote ${catalog.heroes.length} heroes, ${skins} skins, ${catalog.items.length} items, ${catalog.modes.length} modes, ${catalog.activities.length} activities`,
);
