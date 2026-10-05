import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createCodeExecutionTool } from './tool.js';

const prompt = `You are a csv comparison tool. You will be given two csv files, and your task is to compare them and generate output excel file containing table with original csv file data and merged with differences highlighted from second csv file. The output excel file should be named 'comparison_output.xlsx'. Please provide the output excel file as base64 encoded string in your response.`;

export async function compare(filebase: string, scenariofile: string): Promise<AnthropicMessage> {
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", prompt, [filebase, scenariofile], true);
  let answer = await sendMessages('claude-sonnet-5', messages, createCodeExecutionTool());
  return answer;
}

compare("test.csv", "scenario9.csv").then((response) => {
  console.log("Comparison response: ", response);
}).catch((error) => {
  console.error("Error during comparison: ", error);
});