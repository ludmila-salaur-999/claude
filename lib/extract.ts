import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createCodeExecutionTool } from './tool.js';

export async function extract(prompt: string, filename: string): Promise<AnthropicMessage> {
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", filename, true, prompt);
  let answer = await sendMessages('claude-sonnet-5', messages, createCodeExecutionTool());
  return answer;
}