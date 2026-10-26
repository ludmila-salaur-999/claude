import { expect, Locator, Page, test } from '@playwright/test';
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

export class TestPage {

    private page: Page;
    private successButton: Locator;
    private errorButton: Locator;

    constructor(page: Page){
        this.page = page;
        this.successButton = page.locator('#downloadPDF');
        this.errorButton = page.locator("#downloadScenarioPDF");
    }

    async clickSuccessButton() {
        await this.runFlow(this.successButton);
    }

    async clickErrorButton() {
        await this.runFlow(this.errorButton);
    }

    async runFlow(button: Locator) {
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
        const downloadPromise = this.page.waitForEvent('download');
        await button.click({ delay: 300 });//.evaluate((el: HTMLElement) => el.click());
        const download = await downloadPromise;
        const fileName1 = download.suggestedFilename();
        console.log(`Файл скачан: ${fileName1}`);
        let outputPath = path.join(INPUT_DIR_FILES, fileName1);
        await download.saveAs(outputPath);    
        console.log('Running MCP...');    
        await runMCPWorkflow(); 
        const fileName2 = "output.png";
        const sourcePath = path.resolve(__dirname, '..');
        const copied = await moveFile(fileName2, sourcePath, OUTPUT_DIR_FILES);  
        console.log('Running Bash...');
        let result: string = "None";
        if (copied) {
            result = await runExtractAndCompareWorkflow(fileName1, fileName2);
        } else {
            result = "No file/s was/ere downloaded."
        }        
        expect(result).toContain("Test passed.");    
    }    
}
