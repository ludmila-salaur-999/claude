import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { extract } from '../lib/extract.js';
import { compare } from '../lib/compare.js';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export async function runExtractAndCompareWorkflow(fileName1: string, fileName2: string): Promise<string> {
    //Extract from pdf
    let prompt = "Extract table from pdf document into generated output csv only wide data file one row per region matched to existing column names split into neighbouring columns where applies with exactly same group member column name each (e.g. header group R1/Q1 should be split into R1 and Q1) as 'output.csv'. The pdf is provided as base64 encoded string in document content.";
    let answer = await extract(prompt, fileName1);

    let textBlock = answer.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
    ); 
    
    console.log("Extracted text: ", textBlock?.text);

    //Extract from png
    prompt = "Extract table from png document into generated output csv only wide data file one row per region matched to existing column names split into neighbouring columns where applies with exactly same group member column name each (e.g. header group R1/Q1 should be split into R1 and Q1) as 'output2.csv'. The png is provided as base64 encoded string in image content.";
    answer = await extract(prompt, fileName2);

    textBlock = answer.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
    ); 
    
    console.log("Extracted text: ", textBlock?.text);        

    // Now you can call the compare function with the extracted CSV and a scenario file
    const result = await compare('output2.csv', 'output.csv');
    console.log("Comparison result: ", result);

    return result;
}