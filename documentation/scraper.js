const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

/**
 * API Documentation Scraper
 * Extracts Method, Path, and Description from Swagger-like HTML pages.
 * 
 * Usage: 
 * 1. npm install playwright cheerio
 * 2. node documentation/scraper.js <url_or_local_file_path> [output_name] [--headful] [--cdp <url>]
 * 
 * To launch Chrome for CDP in PowerShell:
 * & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:LOCALAPPDATA\ChromeScraper"
 */

const input = process.argv[2];
const outputBase = process.argv[3] || 'api_extract';

if (!input) {
    console.log('Usage: node scraper.js <url_or_filepath> [output_basename]');
    process.exit(1);
}

async function run() {
    let browser;
    let cdpUrl = null;
    try {
        let html;
        if (input.startsWith('http')) {
            const cdpIndex = process.argv.indexOf('--cdp');
            cdpUrl = cdpIndex !== -1 ? process.argv[cdpIndex + 1] : null;

            let context;
            let page;

            if (cdpUrl) {
                console.log(`Connecting to existing browser via CDP: ${cdpUrl}...`);
                browser = await chromium.connectOverCDP(cdpUrl);
                const contexts = browser.contexts();
                context = contexts.length > 0 ? contexts[0] : await browser.newContext();
                page = await context.newPage();
            } else {
                console.log(`Launching browser to fetch: ${input}...`);
                browser = await chromium.launch({ 
                    headless: !process.argv.includes('--headful'),
                    args: ['--disable-blink-features=AutomationControlled']
                });
                context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });
                page = await context.newPage();
                
                // Mask automation flags
                await page.addInitScript(() => {
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                });
            }
            
            // TORN Swagger takes a moment to render the "opblock" elements
            await page.goto(input, { waitUntil: 'networkidle' });
            console.log("Waiting for content to load. If you see a captcha, please solve it in the browser window...");
            await page.waitForSelector('.opblock', { timeout: 90000 }).catch(() => console.log("Warning: Timed out waiting for API blocks."));

            // Expand all sections to reveal parameters, schemas, and responses
            console.log("Expanding all API sections to capture hidden details...");
            await page.evaluate(() => {
                document.querySelectorAll('.opblock').forEach(block => {
                    if (!block.classList.contains('is-open')) {
                        const summary = block.querySelector('.opblock-summary');
                        if (summary) summary.click();
                    }
                });
            });
            // Wait for expansion animations/rendering
            await page.waitForTimeout(3000);

            // TORN's Swagger is massive; we need to give it plenty of time to render all detail panes.
            console.log("Waiting for detailed content to render (10s)...");
            await page.waitForTimeout(10000);
            
            html = await page.content();
        } else {
            console.log(`Reading from local file: ${input}...`);
            html = fs.readFileSync(path.resolve(input), 'utf8');
        }

        const $ = cheerio.load(html);
        const data = [];

        // Primary selector for Swagger UI blocks
        $('.opblock').each((i, el) => {
            const $el = $(el);
            const method = $el.find('.opblock-summary-method').text().trim();
            const pathUrl = $el.find('.opblock-summary-path').attr('data-path') || $el.find('.opblock-summary-path').text().trim();
            const summary = $el.find('.opblock-summary-description').text().trim();
            const category = $el.closest('.opblock-tag-section').find('.opblock-tag span').first().text().trim() || 'General';

            // Detailed description inside the expanded block
            const description = $el.find('.opblock-description').text().trim();

            // Extract Parameters
            const parameters = [];
            // Handle multiple possible Swagger UI class naming conventions
            $el.find('.parameters tr, .parameters-table tr').each((_, row) => {
                const name = $(row).find('.parameter__name, .parameters-col_name').text().trim();
                const type = $(row).find('.parameter__type, .parameters-col_type').text().trim();
                const pDesc = $(row).find('.parameter__description, .parameters-col_description').text().trim();
                if (name) parameters.push({ name, type, description: pDesc });
            });

            // Extract Responses
            const responses = [];
            $el.find('.responses-table tr.response, .responses-inner tr').each((_, row) => {
                const code = $(row).find('.response__code, .response-col_status').text().trim();
                const rDesc = $(row).find('.response__description, .response-col_description').text().trim();
                if (code) responses.push({ code, description: rDesc });
            });

            // Capture every bit of text in this block as a fallback
            const allText = $el.text().replace(/\s+/g, ' ').trim();

            if (method && pathUrl) {
                data.push({ 
                    category, 
                    method, 
                    path: pathUrl, 
                    summary, 
                    description,
                    parameters, 
                    responses, 
                    allText 
                });
            }
        });

        // Output as JSON
        fs.writeFileSync(`${outputBase}.json`, JSON.stringify(data, null, 2));
        
        // Output as Markdown Table for readability
        let md = `# API Extraction: ${input}\n\n`;
        data.forEach(item => {
            md += `## [${item.category}] ${item.method} ${item.path}\n`;
            md += `**Summary:** ${item.summary}\n\n`;
            if (item.description) md += `**Description:** ${item.description}\n\n`;
            
            if (item.parameters.length > 0) {
                md += `### Parameters\n| Name | Type | Description |\n| :--- | :--- | :--- |\n`;
                item.parameters.forEach(p => md += `| ${p.name} | ${p.type} | ${p.description} |\n`);
                md += `\n`;
            }
            
            if (item.responses.length > 0) {
                md += `### Responses\n| Code | Description |\n| :--- | :--- |\n`;
                item.responses.forEach(r => md += `| ${r.code} | ${r.description} |\n`);
                md += `\n`;
            }
            md += `---\n\n`;
        });
        fs.writeFileSync(`${outputBase}.md`, md);

        console.log(`\nSuccess! Extracted ${data.length} endpoints.`);
        console.log(`Files created: ${outputBase}.json, ${outputBase}.md`);

        if (browser) {
            if (cdpUrl) {
                browser.close(); // Don't wait for the browser to close when using CDP mode
            } else {
                await browser.close();
            }
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

run();