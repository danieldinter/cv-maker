import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

async function loadDefaultsModule(repoRoot: string = path.resolve()) {
  const defaultsPath = path.join(repoRoot, "lib", "defaults.ts");
  try {
    const url = pathToFileURL(defaultsPath).href;
    return await import(url);
  } catch (err: any) {
    console.error(
      "Failed to import defaults module:",
      defaultsPath,
      err?.message || String(err),
    );
    throw err;
  }
}

async function loadInstanceConfig(
  repoRoot: string = path.resolve(),
  instanceDirName: string | null,
): Promise<any | null> {
  if (!instanceDirName) return null;
  const jsonPath = path.join(
    repoRoot,
    "instances",
    instanceDirName,
    "config.json",
  );
  try {
    const txt = await fs.readFile(jsonPath, "utf8");
    const cfg = JSON.parse(txt);
    if (!cfg) return null;
    const defaultsModule = await loadDefaultsModule(repoRoot);
    const cfgAppliedDefaults = defaultsModule.applyDefaults(cfg);
    return cfgAppliedDefaults;
  } catch (err: any) {
    console.error(
      "Failed to load instance config (config.json required):",
      jsonPath,
      err?.message || String(err),
    );
    return null;
  }
}

export { loadInstanceConfig };
