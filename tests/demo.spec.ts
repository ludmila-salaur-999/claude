import { expect, test } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { runMCPWorkflow } from '../workflows/mcp_workflow.js';
import { runExtractAndCompareWorkflow } from '../workflows/extract_and_compare_workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');

test('This demo input should pass', async ({ page }) => {
    console.log('Running Playwright part...');
    await page.goto("http://localhost:8080/test.html");
    await page.getByText("Download as PDF").click();
    console.log('Running MCP...');    
    await runMCPWorkflow(); 
    console.log('Running Bash...');
    const result = await runExtractAndCompareWorkflow();
    expect(result).toContainEqual("Test passed."); 
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
