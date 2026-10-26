import { expect, test } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { moveFile } from '../lib/file_util.js';
import { fileURLToPath } from 'node:url';
import { runMCPWorkflow } from '../workflows/mcp_workflow.js';
import { runExtractAndCompareWorkflow } from '../workflows/extract_and_compare_workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');
const INPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.INPUT_DIR_FILES ?? 'input/files');

test('This demo input should pass', async ({ page }) => {
    console.log('Running Playwright part...');
    await page.goto("http://localhost:8080/test.html");
    await expect(page.locator('#downloadPDF')).toBeVisible();
    await expect(page.locator('#downloadPDF')).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloadPDF').click({ delay: 300 });//.evaluate((el: HTMLElement) => el.click());
    const download = await downloadPromise;
    let fileName = download.suggestedFilename();
    console.log(`Файл скачан: ${fileName}`);
    let outputPath = path.join(INPUT_DIR_FILES, fileName);
    await download.saveAs(outputPath);    
    console.log('Running MCP...');    
    await runMCPWorkflow(); 
    fileName = "output.png";
    const sourcePath = path.resolve(__dirname, '..');
    const copied = await moveFile(fileName, sourcePath, OUTPUT_DIR_FILES);  
    console.log('Running Bash...');
    let result: string = "None";
    if (copied) {
        result = await runExtractAndCompareWorkflow();
    } else {
        result = "No file/s was/ere downloaded."
    }        
    expect(result).toContain("Test passed."); 
});

test.afterEach(async ({ page }, testInfo) => {
  // Проверяем, упал ли тест, и было ли это первой попыткой (или ретраем)
  if (testInfo.status !== testInfo.expectedStatus) {
    
    const specificFile = path.join(OUTPUT_DIR_FILES, `comparison_output.xlsx`);
    
    testInfo.attachments.push({
      name: 'Failed Comparison Report',
      path: specificFile,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }
});
