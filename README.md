# cv-maker

`cv-maker` is a small tool to create a PDF CV/Resume and Cover Letter created in HTML and rendered to PDF.

The tool is built with Vite, TypeScript, Svelte and Puppeteer to create a Resume or Curriculum Vitae (CV) and an optional Cover Letter. The data used in the CV is saved as structured JSON data. The CV is then rendered using a template as HTML and can be accessed on the browser for preview. Using CLI scripts the HTML page can be rendered as PDF using Puppeteer.

## CV JSON data

The data should go into `/data` directory. The schema can be found in `/lib/schema.json`. It is based on the [schema](https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json) of [JSONresume](https://jsonresume.org) (see [their docs](https://docs.jsonresume.org/)). An example CV can be found in `example/data/`.

## Instance configuration file

An instance is a single copy of the CV. This can be useful to slightly change the base data in `/data` for different employers or positions, e.g. when you want to accentuate different keywords.

The config for an instance should be placed in `instances/<instanceDir>/config.js` and can contain the following settings:

- `name`: The name of the instance (can be different from `instanceDir`)
- `language`: The language of the CV, can currently be either `en` or `de`
- `template` (optional): The name of the output template in `src/template/<name>`. Defaults to the `default` template if no value is given.
- `baseDataPath` (optional): The path to the base data where the CV JSON is located. Defaults to `data/`.
- `photo` (optional): The photo file if you want to include it on your CV. Should be placed in `data/assets/`.
- `includeProjects` (optional): An array of project IDs to include from the base data. Defaults to `null` and is interpreted as including all projects.
- `includeSkills` (optional): An array of skill `key` values (from the CV data) to include on this instance's CV. When present only the listed skills will be printed. Example: `"includeSkills": ["frontend-development","backend-development"]`
- `includeCourses` (optional)
- `includeLanguages` (optional): An array of language `key` values (from the CV data) to include on this instance's CV. When omitted or `null`, all languages are printed. Example: `"includeLanguages": ["de","en"]`
- `includeCourses` (optional)
- `showProjectStack` (optional): Boolean whether tool stack should be printed for projects. Default is `true`.
- `outputDir` (optional): The path in which the generated JSON and PDF of an instance are stored. Defaults to `/instance/<name>/generated`.
- `overload` (optional): Possibility to overload certain parts of the JSON base data.

## Templates

In `src/template/<name>` different templates can be added. The `cv-maker` comes with a default template.

## How to use

- `npm install`: First install all dependencies
- `npm run dev`: Runs the dev server, listens for template changes and serves the HTML to your browser.
- `npx ts-node scripts/merge-cv.ts --instanceDir=<name>`: Respects the configuration in `/instance/<name>/config.json` to generate a CV JSON data file in `/instance/<name>/generated/` from the JSON files provided in `/data`.
- `npx ts-node scripts/build-and-pdf.ts --instanceDir=<name>`: Respects the configuration in `/instance/<name>/config.json` to run a full build and output the PDF file in `/instance/<name>/generated/`. The build is a seven-step procedure containing:

1. Merge of CV parts using the above mentioned merge script
2. Validation of merged JSON against schema
3. `npm run check`
4. `vite build` to run a prod build
5. Start of preview server as the PDF is generated from the prod build in the step before
6. Generate PDF from the preview server
7. Compress with `gs` (GhostScript) if available to reduce PDF size
