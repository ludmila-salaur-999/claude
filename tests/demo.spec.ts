import { expect, test } from '@playwright/test';
import { runMCPWorkflow } from '../workflows/mcp_workflow.js';
import { runExtractAndCompareWorkflow } from '../workflows/extract_and_compare_workflow.js';

test('This demo input should pass', async ({ page }) => {
    await runMCPWorkflow().catch(console.error); 
    await page.goto("http://localhost:8080/test.html");
    await page.getByText("Download as PDF").click();
    const result = await runExtractAndCompareWorkflow();
    expect(result).toContainEqual("Test passed."); 
});