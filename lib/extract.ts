import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createCodeExecutionTool } from './tool.js';
import Anthropic from '@anthropic-ai/sdk';

export async function extract(prompt: string, filename: string): Promise<AnthropicMessage> {
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", prompt, filename);
  let answer = await sendMessages('claude-sonnet-5', messages, createCodeExecutionTool());
  return answer;
}

export async function extractPlus(filename: string, type: 'pdf' | 'png', outputFilename: string): Promise<AnthropicMessage> {
  const prompt = `Extract table from ${type} document into generated output csv only wide data file one row per region matched to existing column names split into neighbouring columns where applies with exactly same group member column name each (e.g. header group R1/Q1 should be split into R1 and Q1) as '${outputFilename}'. The ${type} is provided as base64 encoded string in document/image content.`;
  return await extract(prompt, filename);
}

async function main() {
    const answer = await extractPlus('test.pdf', 'pdf', 'output.csv');

    const textBlock = answer.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
    ); 
    
    console.log("Extracted text: ", textBlock?.text);   
}

// main();