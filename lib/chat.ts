import { ContentBlock, MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import 'dotenv/config'; // Automatically loads your .env file
import { mkdirSync, readFileSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getClient } from './client.js';
import { uploadFile, downloadFile, deleteFiles } from './file_util.js';
import { Message, createPDFMessage, createTextMessage, createUploadMessage } from './message.js';
import { Tool, createCodeExecutionTool, createEvaluationTool } from './tool.js';
import { isContentBlockArray } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', 'prompt-eval/output/files');
mkdirSync(OUTPUT_DIR_FILES, { recursive: true });
const INPUT_DIR_FILES = path.resolve(__dirname, '..', 'prompt-eval/input/files');

const anthropic = getClient();

export async function addMessage(messages: Message[], role: "user" | "assistant", content: string | [string, string] | ContentBlock[], isFile: boolean = false, text?: string): Promise<Message[]> {
  let newMessage: Message | undefined;
  let safeFilename: string = "";
  let destinationFile: string = "";
  if (isFile && !Array.isArray(content)) {
    safeFilename = path.basename(content);
    destinationFile = path.join(INPUT_DIR_FILES, safeFilename);
    const fileContent = readFileSync(destinationFile, "base64");
    const pdfMessage = createPDFMessage(fileContent);
    const textMessage = createTextMessage(text ?? "");
    newMessage = { role, content: [...pdfMessage, ...textMessage] };
  } else if (!Array.isArray(content) || isContentBlockArray(content)) {
    newMessage = { role, content };
  } else if (!isContentBlockArray(content)){
    safeFilename = path.basename(content[0]);
    destinationFile = path.join(INPUT_DIR_FILES, safeFilename);
    const fileContent = readFileSync(destinationFile, "base64");
    const pdfMessage = createPDFMessage(fileContent);
    const textMessage = createTextMessage(text ?? "");    
    safeFilename = path.basename(content[1]);
    destinationFile = path.join(OUTPUT_DIR_FILES, safeFilename);    
    const uploadedFileID = await uploadFile(destinationFile);
    const uploadMessage = createUploadMessage(uploadedFileID);
    newMessage = { role, content: [...pdfMessage, ...uploadMessage, ...textMessage] };
  }
  // console.log(JSON.stringify(messages, null, 2));
  return newMessage? [...messages, newMessage] : messages;
}

function createFullMessage(model: string, messages: Message[], temperature: number = 0.7, stop_sequences: string[] = ["```"]): MessageCreateParamsNonStreaming {
  return {
    model: model,
    max_tokens: 1024,
    messages: messages,
    temperature: temperature,
    // stop_sequences: stop_sequences, 
    // system: system,
    // tools: tools
  };
}

function createShortMessage(model: string, messages: Message[], tools?: any[]): MessageCreateParamsNonStreaming {
  return {
    model: model,
    max_tokens: 3024,
    thinking: {
      type: "disabled"
    },
    messages: messages,
    tools: tools,
    tool_choice: {"type": "any"} //"tool", "name": "submit_evaluation"},
  };
}

export async function sendMessages(model: string, messages: Message[], tools?: any[], temperature?: number, stop_sequences?: string[]): Promise<AnthropicMessage> {
  let fullMessage: MessageCreateParamsNonStreaming;
  if (temperature !== undefined && stop_sequences !== undefined) {
    fullMessage = createFullMessage(model, messages, temperature, stop_sequences);
  } else {
    fullMessage = createShortMessage(model, messages, tools);
  }

  const answer = await anthropic.messages.create(fullMessage);
  
  // Extract the file IDs from the response and download each created file
  await downloadFile(answer);

  return answer;
}

async function answerAsStream(messages: Message[], temperature: number = 0): Promise<void> {
  const stream = anthropic.messages.stream({ 
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: messages,
    temperature: temperature,
    // system: 'You are a developer that gives very concise answers on IT subjects.',
    // stop_sequences: ["```"],
    tools: createCodeExecutionTool()
  });

  // 1. Listen for individual text chunks as they arrive
  stream.on('text', (textChunk: string) => {
    process.stdout.write(textChunk);
  });

  // 2. Listen for the completion of the message
  stream.on('finalMessage', (message) => {
    console.log('\n\n--- Stream Completed ---');
    console.log(`Usage tokens -> Input: ${message.usage.input_tokens}, Output: ${message.usage.output_tokens}`);
  });

  // 3. Optional: Wait for the entire stream to finish executing
  const msg = await stream.finalMessage();
  // console.log('Stream final message content blocks:', JSON.stringify(msg.content, null, 2));
 
  // Extract the file IDs from the response and download each created file
  await downloadFile(msg);
}