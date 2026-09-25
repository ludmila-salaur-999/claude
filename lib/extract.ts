import type { Message } from './chat.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';

export async function extract(prompt: string, filename: string): Promise<AnthropicMessage> {
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", filename, true, prompt);
  let answer = await sendMessages('claude-sonnet-5', messages);
  return answer;
}

async function main() {
  extract("Extract table from pdf document into generated output excel file. The pdf is attached as base64 encoded string.", "test10.pdf");
  // let messages: Message[] = [];
  // messages = await addMessage(messages, "user", "test10.pdf", true, "Extract table from pdf document into generated output excel file. The pdf is attached as base64 encoded string.");
  // messages = await addMessage(messages, "assistant", "```json");
  // let answer = await sendMessages('claude-sonnet-5', messages);
  // await answerAsStream(messages).catch(console.error);
}

main();