import type { Message } from './lib/message.js';
import { addMessage, sendMessages } from './lib/chat.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { errorCriteria } from './lib/compare.js';

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
  const parsedResult = JSON.parse(textBlock?.text ?? '{}');
  let testStatus = parsedResult.status;
  if (testStatus?.toLocaleLowerCase().includes(errorCriteria.toLocaleLowerCase())) {
      testStatus = `Test failed. Issues found:\n${parsedResult.issues.map((issue: any, index: number) => `${index + 1}. ${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}:\n${issue.details.map((item: string) => `- ${item}`).join('\n')}`).join('\n')}`;
  }
  console.log("Response:\n", testStatus); 

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

async function test() {
  const jsonString = "```json { \"status\": \"Test failed.\", \"issues\": [ { \"type\": \"extra column/s\", \"details\": [ \"Columns R4 and Q4 are in the actual file but not in the base file. They sit between Q2 and R3.\" ] }, { \"type\": \"missing row/s\", \"details\": [ \"The row with Region 'One' (One,1400,1288.567,1660,4999.89,1770,345.01,4400) is missing from the actual file.\" ] }, { \"type\": \"random incorrect value/s\", \"details\": [ \"Region West, column Q2: expected 2345.89, actual 6169.13.\", \"Region Four, column Q3: expected 1212.67, actual 1045.42.\" ] } ] } ```" ;
  const parsedResult = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
  let testStatus = parsedResult.status;
  if (testStatus?.toLocaleLowerCase().includes(errorCriteria.toLocaleLowerCase())) {
      testStatus = `Test failed. Issues found:\n${parsedResult.issues.map((issue: any, index: number) => `${index + 1}. ${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}:\n${issue.details.map((item: string) => `- ${item}`).join('\n')}`).join('\n')}`;
  }
  console.log("Parsed test status:\n", testStatus);  
}

test();
// main();