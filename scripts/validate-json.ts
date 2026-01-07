#!/usr/bin/env ts-node
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";
import { loadJsonSync } from "./utils/load-json.ts";
import { parseArg } from "./utils/parse-args.ts";

/* helper functions */
function mapPartKeyToSchemaProp(key: string, schema: any): string | null {
  if (schema.properties[key]) return key;
  if (schema.properties[`${key}s`]) return `${key}s`;
  if (schema.properties[key.replace(/s$/, "")]) return key.replace(/s$/, "");
  return null;
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

function validateSingleFile(targetFile: string, schema: any): number {
  const ajv = createAjv();
  const validate = ajv.compile(schema);
  try {
    const dataToValidate = loadJsonSync(path.resolve(targetFile));
    const ok = validate(dataToValidate);
    if (!ok) {
      console.error(`Validation errors for ${targetFile}:`, validate.errors);
      return 1;
    } else {
      console.log(`File ${targetFile} is valid against schema.`);
      return 0;
    }
  } catch (err: any) {
    console.error("Failed to read/parse target file", targetFile, err.message);
    return 2;
  }
}

function validateManifestAndParts(
  manifest: any,
  schema: any,
  baseDir: string,
): number {
  const ajv = createAjv();
  const validateManifest = ajv.compile(schema);
  let manifestValid = true;
  let anyPartErrors = false;

  manifestValid = validateManifest(manifest);
  if (!manifestValid) {
    console.error("Manifest validation errors:", validateManifest.errors);
  } else {
    console.log("Manifest is valid against schema.");
  }

  if (manifest && manifest.parts && typeof manifest.parts === "object") {
    for (const [partName, relPath] of Object.entries(manifest.parts)) {
      const partFull = path.resolve(baseDir, relPath as string);
      let partData: any;
      try {
        partData = loadJsonSync(partFull);
      } catch (err: any) {
        console.error(
          `Failed to read part file for '${partName}' at ${partFull}:`,
          err.message,
        );
        anyPartErrors = true;
        continue;
      }

      const schemaProp = mapPartKeyToSchemaProp(partName, schema);
      if (!schemaProp) {
        console.warn(
          `No matching schema property found for part '${partName}'. Skipping validation for this part.`,
        );
        continue;
      }

      const propSchema = schema.properties[schemaProp];
      if (!propSchema) {
        console.warn(
          `Schema fragment for '${schemaProp}' not found. Skipping.`,
        );
        continue;
      }

      let dataToValidate = partData;
      if (
        partData &&
        typeof partData === "object" &&
        Object.prototype.hasOwnProperty.call(partData, schemaProp)
      ) {
        dataToValidate = partData[schemaProp];
      }

      const validatePart = ajv.compile(propSchema);
      const valid = validatePart(dataToValidate);
      if (!valid) {
        console.error(
          `Validation errors in part '${partName}' (${relPath}):`,
          validatePart.errors,
        );
        anyPartErrors = true;
      } else {
        console.log(`Part '${partName}' validated OK (${relPath}).`);
      }
    }
  } else {
    console.warn("Manifest has no 'parts' object to validate.");
  }

  if (!manifestValid || anyPartErrors) {
    console.error("Validation failed.");
    return 1;
  } else {
    console.log("All validations passed.");
    return 0;
  }
}

/* main script */
async function main() {
  const repoRoot = path.resolve();
  const schemaPath = path.join(repoRoot, "lib/schema.json");
  const manifestPath = path.join(repoRoot, "data/cv.de.json");

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const baseDir = path.dirname(manifestPath);

  const targetFile = parseArg("file");

  if (targetFile) {
    const code = validateSingleFile(targetFile, schema);
    process.exitCode = code === 0 ? 0 : code;
    if (code !== 0) process.exit();
    return;
  }

  let manifest: any = null;
  try {
    manifest = loadJsonSync(manifestPath);
  } catch (err: any) {
    console.error("Failed to read/parse manifest", manifestPath, err.message);
    process.exitCode = 2;
    return;
  }

  const code = validateManifestAndParts(manifest, schema, baseDir);
  process.exitCode = code === 0 ? 0 : code;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
