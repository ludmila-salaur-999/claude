import path from 'node:path';
import dotenv from 'dotenv';
import { copyFile } from '../lib/file_util.js';
import { fileURLToPath } from 'node:url';
import { extract } from '../lib/extract.js';
import { compare } from '../lib/compare.js';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export async function runExtractAndCompareWorkflow(): Promise<string> {
    let fileName = "test.pdf";
    let sourcePath = path.resolve(__dirname, '../../../Downloads');
    let destinationPath = path.resolve(__dirname, '..', process.env.INPUT_DIR_FILES ?? 'input/files');
    const copied1 = await copyFile(fileName, sourcePath, destinationPath);
    fileName = "output.png";
    sourcePath = path.resolve(__dirname, '..');
    destinationPath = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');
    const copied2 = await copyFile(fileName, sourcePath, destinationPath);
    if (copied1 && copied2) {
        //Extract from pdf
        let prompt = "Extract table from pdf document into generated output csv only wide data file one row per region with all metric columns as 'output.csv'. The pdf is attached as base64 encoded string.";
        let answer = await extract(prompt, 'test.pdf');

        let textBlock = answer.content.find(
            (block): block is Anthropic.TextBlock => block.type === "text"
        ); 
        
        console.log("Extracted text: ", textBlock?.text);

        //Extract from png
        prompt = "Extract table from png document into generated output csv only wide data file one row per region with all metric columns as 'output2.csv'. The png is attached as base64 encoded string.";
        answer = await extract(prompt, 'output.png');

        textBlock = answer.content.find(
            (block): block is Anthropic.TextBlock => block.type === "text"
        ); 
        
        console.log("Extracted text: ", textBlock?.text);        

        // Now you can call the compare function with the extracted CSV and a scenario file
        const result = await compare('output2.csv', 'output.csv');
        console.log("Comparison result: ", result);

        return result;
    } else {
        return "No file/s was/ere downloaded."
    }
}