#!/usr/bin/env ts-node
import fs from "fs/promises";
import path from "path";
import { marked } from "marked";
import { loadInstanceConfig } from "./utils/load-instance-config.ts";
import { loadJsonAsync } from "./utils/load-json.ts";
import { parseArg } from "./utils/parse-args.ts";

// Disable deprecated marked defaults to avoid runtime warnings.
// These features are deprecated in marked@5.x and will be removed in
// a future release; for now we turn them off to silence warnings.
marked.setOptions({ mangle: false, headerIds: false });
// InstanceConfig type import removed; config is now plain JSON object

// We'll dynamically import lib/defaults.ts at runtime to avoid
// resolution issues when running under different TS/ESM loaders.

/* helper functions */
function deepMerge(target: any, src: any) {
  for (const k of Object.keys(src)) {
    const sv = src[k];
    const tv = target[k];
    if (Array.isArray(sv)) {
      // override arrays entirely
      target[k] = sv;
    } else if (sv && typeof sv === "object") {
      if (!tv || typeof tv !== "object") target[k] = {};
      deepMerge(target[k], sv);
    } else {
      target[k] = sv;
    }
  }
  return target;
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

/* main script */
async function main() {
  const repoRoot = path.resolve();
  // read CLI args
  const instanceDirName = parseArg("instanceDir");

  // load instance config early so we can pick the right language manifest
  const cfg = await loadInstanceConfig(repoRoot, instanceDirName);

  // choose manifest path: prefer `data/cv.<lang>.json` when configured,
  // otherwise try `data/cv.json`, then fall back to `data/cv.de.json`.
  let manifestPath = path.join(repoRoot, "data", "cv.json");
  try {
    if (cfg && cfg.language) {
      const cand = path.join(repoRoot, "data", `cv.${cfg.language}.json`);
      await fs.access(cand);
      manifestPath = cand;
    } else {
      // ensure default exists; if not, we'll fall back below
      await fs.access(manifestPath);
    }
  } catch (err) {
    const fallback = path.join(repoRoot, "data", "cv.de.json");
    try {
      await fs.access(fallback);
      manifestPath = fallback;
    } catch (e) {
      // if none exist, let loadJson throw a clear error
    }
  }

  const manifest = await loadJsonAsync(manifestPath);
  const merged: any = {};

  // copy any top-level keys from manifest (except parts and $schema)
  for (const [k, v] of Object.entries(manifest)) {
    if (k === "parts" || k === "$schema") continue;
    (merged as any)[k] = v;
  }

  if (manifest.parts && typeof manifest.parts === "object") {
    const base = path.dirname(manifestPath);
    for (const [partName, rel] of Object.entries(manifest.parts)) {
      const full = path.resolve(base, rel as string);
      try {
        const part = await loadJsonAsync(full);
        if (part && typeof part === "object") {
          const keys = Object.keys(part);
          if (keys.length === 1) {
            const innerKey = keys[0];
            const commonProps = new Set([
              "basics",
              "work",
              "practicalExperiences",
              "caseStudies",
              "education",
              "awards",
              "certificates",
              "courses",
              "publications",
              "skills",
              "languages",
              "interests",
              "projects",
            ]);
            if (commonProps.has(innerKey)) {
              merged[innerKey] = part[innerKey];
              continue;
            }
          }
        }
        merged[partName] = part;
      } catch (err: any) {
        console.error("Failed to load part", partName, full, err.message);
        process.exitCode = 2;
        return;
      }
    }
  }

  // if instance provided, apply defaults then write to instance output
  if (cfg) {
    const instOutDir = path.join(repoRoot, cfg.outputDir);
    // If an instance config contains an `overload` object, apply it
    // to the merged data so instance-specific values replace base data.
    // Example in instances/<name>/config.json:
    // "overload": { "basics": { "summary": "Instance summary text" } }
    if (cfg.overload && typeof cfg.overload === "object") {
      deepMerge(merged, cfg.overload);
    }

    // Optional cover letter: read instances/<name>/cover.md if present
    // and convert to HTML using `marked`; attach as `coverHtml` on the merged data.
    try {
      const coverPath = path.join(
        repoRoot,
        "instances",
        instanceDirName!,
        "cover.md",
      );
      const coverTxt = await fs.readFile(coverPath, "utf8");
      if (coverTxt && coverTxt.trim().length > 0) {
        // Convert markdown to HTML and attach
        const html = marked.parse(coverTxt);
        // Basic sanitization: remove <script> tags
        merged.coverHtml = html.replace(
          /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
          "",
        );
      }
    } catch (err) {
      // ignore missing cover.md silently
    }
    await ensureDir(instOutDir);
    const instJsonPath = path.join(instOutDir, `cv.${cfg.name}.json`);
    await fs.writeFile(instJsonPath, JSON.stringify(merged, null, 2), "utf8");
    console.log("Wrote merged CV to instance path:", instJsonPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
