import puppeteer, { Browser } from "puppeteer";
import path from "path";

// Usage:
//   node generate-pdf.js [target-url] [output-file]
// Examples:
//   node generate-pdf.js http://localhost:5000 resume.pdf

async function main(): Promise<void> {
  const argv: string[] = process.argv.slice(2);
  let targetUrl: string = argv[0];
  const output: string = argv[1];

  if (!targetUrl) {
    console.error("Error: No target-url or file specified.");
    console.error("Usage: node generate-pdf.js [target-url] [output-file]");
    process.exit(1);
  }

  if (!output) {
    console.error("Error: No output file specified.");
    console.error("Usage: node generate-pdf.js [target-url] [output-file]");
    process.exit(1);
  }

  if (!/^https?:\/\//i.test(targetUrl) && !targetUrl.startsWith("file://")) {
    const resolved = path.resolve(targetUrl);
    targetUrl = `file://${resolved}`;
  }

  let browser: Browser | undefined;
  try {
    console.log(`Launching headless browser to render: ${targetUrl}`);
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Wait up to 30s for network idle
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    const outputPath = path.resolve(output);

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.log(`PDF generated successfully at: ${outputPath}`);
  } catch (err) {
    console.error("Error generating PDF:", err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
