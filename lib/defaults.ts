// Config is now loaded from JSON files, not JS modules

// Basic runtime defaults. This object contains sensible defaults
// for values that may be omitted from an instance config.
export const defaultConfig = {
  template: "default",
  baseDataPath: "data/",
  includeProjects: null,
  includeLanguages: null,
  showProjectStack: true,
  separateCover: false,
};

/**
 * Merge a user-provided InstanceConfig with runtime defaults and
 * derive instance-specific output paths when missing.
 *
 * Returns a config object with defaults applied. The returned type
 * includes an `output` object with `dir`, `generatedJson` and `pdf`.
 */
export function applyDefaults(cfg: any) {
  return {
    name: cfg.name,
    language: cfg.language || "de",
    template: cfg.template ?? defaultConfig.template,
    baseDataPath: cfg.baseDataPath ?? defaultConfig.baseDataPath,
    photo: cfg.photo ?? "",
    includeProjects: cfg.includeProjects ?? defaultConfig.includeProjects,
    includeSkills: cfg.includeSkills ?? [],
    includeLanguages: cfg.includeLanguages ?? defaultConfig.includeLanguages,
    // Preserve an optional `overload` object from instance configs so
    // callers (e.g. scripts/merge-cv.ts) can apply instance-specific
    // overrides to the merged data.
    overload: cfg.overload ?? null,
    includeCourses: cfg.includeCourses ?? [],
    showProjectStack: cfg.showProjectStack ?? defaultConfig.showProjectStack,
    separateCover: cfg.separateCover ?? defaultConfig.separateCover,
    outputDir: cfg.outputDir || `instances/${cfg.name}/generated/`,
  };
}
