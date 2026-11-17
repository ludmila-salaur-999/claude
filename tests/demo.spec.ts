import { test } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { TestPage } from '../page-objects/page.js';
import { existsSync, rename } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');

test('This demo input should pass', async ({ page }) => {
    console.log('Running Playwright part...');
    await page.goto("http://localhost:8080/test.html");
    const testPage = new TestPage(page);
    await testPage.clickSuccessButton();
});

test.only('This demo input should fail', async ({ page }) => {
    console.log('Running Playwright part...');
    await page.goto("http://localhost:8080/test.html");
    const testPage = new TestPage(page);
    await testPage.clickErrorButton();
});

test.afterEach(async ({ page }, testInfo) => {
  // Проверяем, упал ли тест, и было ли это первой попыткой (или ретраем)
  if (testInfo.status !== testInfo.expectedStatus) {
    
    const specificFile = path.join(OUTPUT_DIR_FILES, `comparison_output.xlsx`);
    const specificFileNewName = path.join(OUTPUT_DIR_FILES, `comparison_output_${testInfo.testId}.xlsx`);
    
    rename(specificFile, specificFileNewName, (err) => {
      if (err) throw err;
      console.log('Rename complete!');      
      testInfo.attachments.push({
        name: 'Failed Comparison Report',
        path: specificFileNewName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });      
    });      
  }
});
