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

async function main() {
    const prompt = "Extract table from png document into generated output csv only wide data file one row per region with all metric columns as 'output2.csv'. The png is attached as base64 encoded string.";
    const answer = await extract(prompt, 'output.png');

    const textBlock = answer.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
    ); 
    
    console.log("Extracted text: ", textBlock?.text);   
}

// main();