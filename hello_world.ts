import type { Message } from './lib/message.js';
import { addMessage, sendMessages } from './lib/chat.js';

async function main() {
  //Generate a claude dialogue with multiple turns
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", "Hello world, please answer in a single sentence.");
  // messages = await addMessage(messages, "assistant", "```json");
  let answer = await sendMessages('claude-sonnet-5', messages);
  let result = answer.content[0].type === "text" ? answer.content[0].text : "";
  console.log("1: " + result);
  messages = await addMessage(messages, "assistant", result);
  messages = await addMessage(messages, "user", "Generate another answer in a single sentence.");
  answer = await sendMessages('claude-sonnet-5', messages);
  result = answer.content[0].type === "text" ? answer.content[0].text : "";
  console.log("2: " + result);

  //Generate creative json response
  messages = [];
  messages = await addMessage(messages, "user", "Generate a json object containing a random name, age, and city.");
  messages = await addMessage(messages, "assistant", "```json");
  answer = await sendMessages('claude-haiku-4-5', messages, undefined, 0.7, ["```"]);
  result = answer.content[0].type === "text" ? answer.content[0].text : "";
  console.log("3:\n" + result);

  //TEST
  // await answerAsStream(messages).catch(console.error);
}

main();