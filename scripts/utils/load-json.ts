import { promises as fsAsync } from "fs";
import fs from "fs";

async function loadJsonAsync(p: string) {
  const txt = await fsAsync.readFile(p, "utf8");
  return JSON.parse(txt);
}

function loadJsonSync(fp: string) {
  return JSON.parse(fs.readFileSync(fp, "utf8"));
}

export { loadJsonAsync, loadJsonSync };
