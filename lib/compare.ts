import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import { createCodeExecutionTool } from './tool.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { BashAgent } from '../agents/bash_agent.js';
import 'dotenv/config'; // Automatically loads your .env file
import { mkdirSync, readFileSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');
mkdirSync(OUTPUT_DIR_FILES, { recursive: true });
const path_ = process.env.OUTPUT_DIR_FILES ?? 'output/files';

const passedCriteria = "Test passed.";

export async function compare(filebase: string, scenariofile: string): Promise<string> {
  let messages: Message[] = [];
  let prompt = `You are a software automated test which has to compare two csv files.\n` +
  `If files are different generate valid detailed sample error message.\n` +
  `Error message should list only identified issues, classified as:\n` +
  `  - "random incorrect value/s"\n` +
  `  - "duplicate row/s"\n` +
  `  - "missing row/s"\n` +
  `  - "extra row/s"\n` +
  `  - "missing column/s"\n` +
  `  - "extra column/s"\n` +
  `  - "incorrect row ordering"\n` +
  `  - "incorrect column ordering"\n` +
  `Respond with no extra comments.\n` +
  `Files: <base>${filebase}</base> and <actual>${scenariofile}</actual>\n` + 
  `Request to call bash cat with exact path ${OUTPUT_DIR_FILES} and file names ${filebase} and ${scenariofile} to read the files before answering.\n` +
  // `Run only exactly one command per each classification: awk <params> <base> <actual> without creating /tmp/cmp.awk.\n` +
  // `After running each command, you should immediately return the result.\n` +
  // `Return immediately when you find the first difference, do not continue comparing after that.\n` +
  `If the files are identical (ignore line-ending differences if present), respond with a message "${passedCriteria}" with no extra comments.`;
  messages = await addMessage(messages, "user", prompt, [filebase, scenariofile], true);
  const bashAgent = new BashAgent();
  const answer = await bashAgent.startConversation(messages, createCodeExecutionTool()); 
  bashAgent.closeConnection();
  const textBlock = answer?.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  console.log("Comparison test response: ", textBlock?.text); 

  const passed = textBlock?.text.toLowerCase().includes(passedCriteria.toLowerCase());
  console.log(passed); // Output: true

  if (!passed) {
    messages = [];
    prompt = `You are a csv comparison tool. You will be given two csv files, and your task is to compare them and generate output excel file containing table with original csv file data and merged with differences highlighted from second csv file. The output excel file should be named 'comparison_output.xlsx'. Please provide the output excel file as base64 encoded string in your response.`; 
    messages = await addMessage(messages, "user", prompt, [filebase, scenariofile], true);
    await sendMessages('claude-sonnet-5', messages, createCodeExecutionTool());
  }

  return passed ? passedCriteria : textBlock?.text ?? "No response from comparison tool."; 
}

// compare("test.csv", "test2.csv").then((response) => {
//   console.log("Comparison response: ", response);
// }).catch((error) => {
//   console.error("Error during comparison: ", error);
// });