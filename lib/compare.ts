import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createCodeExecutionTool } from './tool.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { BashAgent } from '../agents/bash_agent.js';

const passedCriteria = "Test passed.";

export async function compare(filebase: string, scenariofile: string): Promise<string> {
  let messages: Message[] = [];
  let prompt = `You are a software automated test which has capabilities of csv comparison tool. You will be given two csv files, and your task is to compare them and if different generate valid detailed sample error message, listing only all identified issues, classified as "random incorrect value/s", "duplicate row/s", "missing row/s", "extra row/s", "missing column/s", "extra column/s", "incorrect row ordering", and "incorrect column ordering" with no extra comments. File C:\\Users\\Admin\\Documents\\project\\scenarios\\${filebase} is the base file and C:\\Users\\Admin\\Documents\\project\\scenarios\\${scenariofile} is the actual file, use only bash tool cat with exact paths provided to read the files. If the files are identical, please respond with a message "${passedCriteria}" with no extra comments.`;
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

compare("test.csv", "scenario9.csv").then((response) => {
  console.log("Comparison response: ", response);
}).catch((error) => {
  console.error("Error during comparison: ", error);
});