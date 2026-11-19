import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import { createCodeExecutionTool, createTestStatusTool } from './tool.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { BashAgent } from '../agents/bash_agent.js';
import 'dotenv/config'; // Automatically loads your .env file
import { mkdirSync, readFileSync } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { jsonOutputFormat } from './output_format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');
mkdirSync(OUTPUT_DIR_FILES, { recursive: true });

export const passedCriteria = "Test passed.";
export const errorCriteria = "Test failed.";

export async function compare(filebase: string, scenariofile: string): Promise<string> {
  let messages: Message[] = [];
  let prompt = `You are a software automated test which has to compare two csv files.\n` +
  `If the files are identical (ignore line-ending differences if present), respond with a json message with status "${passedCriteria}" with no extra comments.` + 
  `If files are different generate valid detailed error bug report, and respond with a json message with status "${errorCriteria}" and list the issues found in the files.` +
  `Error message should list only identified issues, classified as issue types:\n` +
  `  - "random incorrect value/s"\n` +
  `  - "duplicate row/s"\n` +
  `  - "missing row/s"\n` +
  `  - "extra row/s"\n` +
  `  - "missing column/s"\n` +
  `  - "extra column/s"\n` +
  `  - "incorrect row ordering"\n` +
  `  - "incorrect column ordering"\n` +
  `Files to compare: <files><base>${filebase}</base><actual>${scenariofile}</actual></files>\n` + 
  `Request to call bash cat with path ${OUTPUT_DIR_FILES} and file names ${filebase} and ${scenariofile} to read the files before answering.\n` +
  'Respond with JSON. Keep your response consise and direct, no extra comments.' +
  'Error response shape:' +
  `{` +
  `  "status": "${errorCriteria}"` +
  `  "issues": [` +
  `    {` +
  `      "type": "string"` +
  `      "details": ["string"]` +
  `    },` +
  `  ]` +
  `}` +
  `Success response precisely:` +
  `{` +
  `  "status": "${passedCriteria}"` +
  `}`;  
  messages = await addMessage(messages, "user", prompt, [filebase, scenariofile], true);
  const bashAgent = new BashAgent();
  const answer = await bashAgent.startConversation(messages, [...createCodeExecutionTool(), ...createTestStatusTool()]); 
  bashAgent.closeConnection();
  const textBlock = answer?.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  console.log("Comparison test response: ", textBlock?.text); 
  const jsonString = textBlock?.text ?? '{}';
  const parsedResult = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
  let testStatus = parsedResult?.status; 

  if (testStatus === errorCriteria) {
    messages = [];
    prompt = `You are a csv comparison tool. You will be given two csv files, and your task is to compare them and generate output excel file containing table with original csv file data and merged with differences highlighted from second csv file. The output excel file should be named 'comparison_output.xlsx'. Please provide the output excel file as base64 encoded string in your response.`; 
    messages = await addMessage(messages, "user", prompt, [filebase, scenariofile], true);
    await sendMessages('claude-sonnet-5', messages, createCodeExecutionTool());
  }

  if (testStatus?.toLocaleLowerCase().includes(errorCriteria.toLocaleLowerCase())) {
      testStatus = `Test failed. Issues found:\n${parsedResult.issues.map((issue: any, index: number) => `${index + 1}. ${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}:\n${issue.details.map((item: string) => `- ${item}`).join('\n')}`).join('\n')}`;
  }   

  return testStatus ?? "No response from comparison tool."; 
}

// compare("test.csv", "test2.csv").then((response) => {
//   console.log("Comparison response: ", response);
// }).catch((error) => {
//   console.error("Error during comparison: ", error);
// });