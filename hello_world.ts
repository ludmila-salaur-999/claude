import type { Message } from './lib/message.js';
import { addMessage, sendMessages } from './lib/chat.js';
import { Anthropic } from '@anthropic-ai/sdk';

async function main() {
  //Generate a claude dialogue with multiple turns
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", "Generate a sample 2 tables data comparison test bug report, listing 3 random issue types with one or couple specific issues in case of error, or just success status if no issues found. The report should be in json format with a status field and an optional issues array field containing issue type and issue details. E.g. issue type could be 'random incorrect value/s', 'duplicate row/s', 'missing row/s', 'extra row/s', 'missing column/s', 'extra column/s', 'incorrect row ordering', 'incorrect column ordering'.");
  // messages = await addMessage(messages, "assistant", "```json");
  let answer = await sendMessages('claude-sonnet-5', messages);

  const textBlock = answer?.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  console.log("Response:\n", textBlock?.text); 

  // let result = answer.content[0].type === "text" ? answer.content[0].text : "";
  // console.log("1: " + result);
  // messages = await addMessage(messages, "assistant", result);
  // messages = await addMessage(messages, "user", "Generate another answer in a single sentence.");
  // answer = await sendMessages('claude-sonnet-5', messages);
  // result = answer.content[0].type === "text" ? answer.content[0].text : "";
  // console.log("2: " + result);

  //Generate creative json response
  // messages = [];
  // messages = await addMessage(messages, "user", "Generate a json object containing a random name, age, and city.");
  // messages = await addMessage(messages, "assistant", "```json");
  // answer = await sendMessages('claude-haiku-4-5', messages, undefined, 0.7, ["```"]);
  // result = answer.content[0].type === "text" ? answer.content[0].text : "";
  // console.log("3:\n" + result);

  //TEST
  // await answerAsStream(messages).catch(console.error);
}

main();