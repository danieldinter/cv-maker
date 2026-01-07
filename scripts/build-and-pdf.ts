#!/usr/bin/env ts-node
import { spawn, spawnSync } from "child_process";
import path from "path";
import fs from "fs/promises";
import { loadInstanceConfig } from "./utils/load-instance-config.ts";
import { parseArg } from "./utils/parse-args.ts";

/* helper functions */
function run(
  cmd: string,
  args: string[] = [],
  opts: Record<string, any> = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function waitForUrl(url: string, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (err) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timeout waiting for preview server");
}

function isGsAvailable() {
  try {
    const r = spawnSync("gs", ["--version"], { stdio: "ignore", shell: true });
    return !!r && r.status === 0;
  } catch (err) {
    return false;
  }
}

/* main script */
async function main(): Promise<void> {
  const repoRoot = path.resolve();
  const mergeScript = path.join(repoRoot, "scripts", "merge-cv.ts");
  const validateScript = path.join(repoRoot, "scripts", "validate-json.ts");
  const generatePdfScript = path.join(repoRoot, "scripts", "generate-pdf.ts");

  const instanceDirName = parseArg("instanceDir") || "default";

  const stepColorPrefix = "\u001b[1;33m%s\x1b[0m"; // bold yellow;

  // Define configPath before using it to read config.json
  const configPath = path.join(
    repoRoot,
    "instances",
    instanceDirName,
    "config.json",
  );

  let instanceConfig = "{}";
  let instanceName = instanceDirName; // Default to instanceDir if name is not in config
  const cfg = await loadInstanceConfig(repoRoot, instanceDirName);
  instanceConfig = JSON.stringify(cfg);
  instanceName = cfg?.name;

  try {
    // Create a filesystem-friendly timestamp for generated files
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    /* =============== */
    /* Step 1 */
    /* =============== */
    console.log(stepColorPrefix, `1) Merging CV parts`);
    const mergeArgs = [`--instanceDir=${instanceDirName}`];
    await run("ts-node", [mergeScript, ...mergeArgs]);

    const mergedPath = path.join(
      repoRoot,
      "instances",
      instanceDirName,
      "generated",
      `cv.${instanceName}.json`,
    );
    // Save a timestamped copy of the merged JSON so builds don't overwrite history
    try {
      const mergedDir = path.dirname(mergedPath);
      const mergedBase = path.basename(mergedPath, ".json");
      const tsMergedName = `${mergedBase}.${timestamp}.json`;
      const tsMergedPath = path.join(mergedDir, tsMergedName);
      await fs.copyFile(mergedPath, tsMergedPath);
      console.log("Saved timestamped merged JSON as", tsMergedPath);
    } catch (err: any) {
      console.warn("Could not save timestamped merged JSON:", err.message);
    }

    /* =============== */
    /* Step 2 */
    /* =============== */
    console.log(stepColorPrefix, `2) Validating merged JSON`);
    await run("node", [validateScript, `--file=${mergedPath}`]);

    /* =============== */
    /* Step 3 */
    /* =============== */
    console.log(stepColorPrefix, `3) Running project checks (npm run check)`);
    await run("npm", ["run", "check"]);

    /* =============== */
    /* Step 4 */
    /* =============== */
    console.log(stepColorPrefix, `4) Building project (vite build)`);

    // Load merged CV data and instance config for env vars
    let cvData = "{}";
    try {
      cvData = JSON.stringify(
        JSON.parse(await fs.readFile(mergedPath, "utf8")),
      );
    } catch (err: any) {
      console.warn(
        "Could not read merged CV data for env.VITE_CV_DATA:",
        err.message,
      );
    }

    await run("npx", ["vite", "build"], {
      env: {
        ...process.env,
        VITE_CV_DATA: cvData,
        VITE_CV_INSTANCE_CONFIG: instanceConfig,
      },
    });

    /* =============== */
    /* Step 5 */
    /* =============== */
    console.log(stepColorPrefix, `5) Starting preview server (vite preview)`);

    // Ensure data assets are available in dist so preview can serve '/data/assets/...'
    try {
      const srcAssets = path.join(repoRoot, "data", "assets");
      const dstAssets = path.join(repoRoot, "dist", "data", "assets");
      await run("mkdir", ["-p", dstAssets]);
      await run("cp", ["-R", `${srcAssets}/.`, dstAssets]);
      console.log("Copied data assets to dist for preview serving");
    } catch (err: any) {
      console.warn("Failed to copy data assets to dist:", err.message);
    }

    const preview = spawn("npm", ["run", "preview"], {
      shell: true,
      stdio: "inherit",
    });

    let outputDir;
    let templateName;
    let separateCover;
    try {
      const configRaw = await fs.readFile(configPath, "utf8");
      const config = JSON.parse(configRaw);
      // Import applyDefaults from defaults.ts
      const defaultsModule = await import(
        path.join(repoRoot, "lib", "defaults.ts")
      );
      const finalConfig = defaultsModule.applyDefaults(config);
      outputDir = path.isAbsolute(finalConfig.outputDir)
        ? finalConfig.outputDir
        : path.join(repoRoot, finalConfig.outputDir);
      templateName = finalConfig.template || "default";
      separateCover = finalConfig.separateCover;
    } catch (err: any) {
      console.warn(
        "Could not load instance config or apply defaults, using fallback outputDir and template:",
        err.message,
      );
    }
    // Prefer the Vite preview default port (4173) and the built template HTML
    const previewPort = process.env.PREVIEW_PORT
      ? Number(process.env.PREVIEW_PORT)
      : 4173;
    const builtUrl = `http://localhost:${previewPort}/src/template/${templateName}/index.html`;
    let url = builtUrl;
    try {
      await waitForUrl(builtUrl, 15000);
    } catch (err) {
      // fallback: dev-style path (used by dev server)
      const devUrl = `http://localhost:5173/src/template/${templateName}/index.html`;
      console.warn(
        `Built template not available at ${builtUrl}, falling back to DEV at ${devUrl}`,
      );
      url = devUrl;
      await waitForUrl(url, 15000);
    }

    /* =============== */
    /* Step 6 */
    /* =============== */
    console.log(stepColorPrefix, `6) Generating PDF via Puppeteer`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const cvPdfName = `cv.${instanceName}.${timestamp}.pdf`;
    const coverPdfName = `cover.${instanceName}.${timestamp}.pdf`;
    const coverOut = path.join(outputDir, coverPdfName);
    const cvOut = path.join(outputDir, cvPdfName);

    if (separateCover) {
      // Generate cover-only and cv-only PDFs by using runtime query param `?mode=`
      const coverUrl = url.includes("?")
        ? `${url}&mode=cover`
        : `${url}?mode=cover`;
      const cvUrl = url.includes("?") ? `${url}&mode=cv` : `${url}?mode=cv`;

      await run("node", [generatePdfScript, coverUrl, coverOut]);
      await run("node", [generatePdfScript, cvUrl, cvOut]);

      preview.kill();
    } else {
      // Generate single PDF with both cover and CV
      await run("node", [generatePdfScript, url, cvOut]);

      preview.kill();
    }

    /* =============== */
    /* Step 7 */
    /* =============== */

    // Compress the generated PDF with GhostScript if available
    if (isGsAvailable()) {
      console.log(stepColorPrefix, `7) Compressing PDFs with GhostScript (gs)`);
      try {
        // Compress CV PDF
        const cvCompressed = path.join(
          path.dirname(cvOut),
          `${path.basename(cvOut, ".pdf")}_compressed.pdf`,
        );

        await run("gs", [
          "-sDEVICE=pdfwrite",
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          "-dPDFSETTINGS=/ebook",
          `-sOutputFile=${cvCompressed}`,
          cvOut,
        ]);

        console.log(`Compressed PDF saved as ${cvCompressed}`);

        // Compress Cover PDF (if applicable)
        if (separateCover) {
          const coverCompressed = path.join(
            path.dirname(coverOut),
            `${path.basename(coverOut, ".pdf")}_compressed.pdf`,
          );

          await run("gs", [
            "-sDEVICE=pdfwrite",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            "-dPDFSETTINGS=/ebook",
            `-sOutputFile=${coverCompressed}`,
            coverOut,
          ]);

          console.log(`Compressed PDF saved as ${coverCompressed}`);
        }
      } catch (err: any) {
        console.warn("PDF compression failed:", err.message);
      }
    } else {
      console.log("GhostScript (gs) not found; skipping PDF compression");
    }
  } catch (err: any) {
    console.error("Build-and-pdf failed:", err.message);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
