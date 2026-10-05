import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFile } from 'fs';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { extract } from '../lib/extract.js';
import type { Message } from '../lib/message.js';
import { addMessage, sendMessages } from '../lib/chat.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'fs';
// import { startConversation as startBashConversation } from '../legacy/bash_dialog.js';
import { BashAgent } from '../agents/bash_agent.js';
import { createCodeExecutionTool, createEvaluationTool } from '../lib/tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_DIR_JSON = path.resolve(__dirname, '..', 'prompt-eval/input/json');
const OUTPUT_DIR_JSON = path.resolve(__dirname, '..', 'prompt-eval/output/json');
mkdirSync(OUTPUT_DIR_JSON, { recursive: true });

const bashAgent = new BashAgent();

async function runPrompt(prompt: string, filename: string): Promise<AnthropicMessage> {
  const answer = await extract(prompt, filename);
  return answer;
}

async function runEval(prompt: string, files: [string, string]): Promise<AnthropicMessage | undefined> {
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", prompt, files);
  const answer = await bashAgent.startConversation(messages, [...createEvaluationTool(), ...createCodeExecutionTool()]);
  // const answer = await startBashConversation(messages);
  return answer;
}

function parseEvaluationPayload(raw: string | undefined): { strengths: string[]; weaknesses: string[]; reasoning: string; score: number } {
  const fallback = { strengths: [] as string[], weaknesses: [] as string[], reasoning: '', score: 0 };

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    const payload = Array.isArray(parsed) ? parsed[0] : parsed;

    if (!payload || typeof payload !== 'object') {
      return fallback;
    }

    return {
      strengths: Array.isArray(payload.strengths)
        ? payload.strengths.map((item: unknown) => String(item))
        : typeof payload.strengths === 'string'
          ? [payload.strengths]
          : [],
      weaknesses: Array.isArray(payload.weaknesses)
        ? payload.weaknesses.map((item: unknown) => String(item))
        : typeof payload.weaknesses === 'string'
          ? [payload.weaknesses]
          : [],
      reasoning: typeof payload.reasoning === 'string' ? payload.reasoning : '',
      score: Number(payload.score) || 0,
    };
  } catch (error) {
    console.error('Error during parsing evaluation json:', error);
    return fallback;
  }
}

async function gradeByModel (prompt: string, files: [string, string], response: AnthropicMessage): Promise<string> {
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  const evalPrompt = [
    'You are an expert secretary assistant. Your task is to evaluate the quality of AI response for the given task.',
    'Original task:',
    '<task>',
    prompt,
    '</task>',
    '<input>',
    `Attached pdf file '${files[0]}'`,
    '</input>',
    'AI response to evaluate:',
    '<text>',
    textBlock?.text ?? '',
    '</text>',
    '<output>',
    `Uploaded AI generated CSV file '${files[1]}'`,
    '</output>',
    'Evaluation format:',
    'Provide your evaluation as structured JSON object with following fields:',
    '- "strengths": An array of 1-3 key strengths',
    '- "weaknesses": An array of 1-3 key areas for improvement',
    '- "reasoning": A concise explanation of your overall assessment',
    '- "score": A number between 1-10',
    'Request to call bash cat with exactly specified path C:\\Users\\Admin\\Documents\\project\\prompt-eval\\output\\files\\output.csv using bash tool to read AI generated content and confirm the accuracy before answering.',
    'Respond with JSON. Keep your response consise and direct.',
    'Example response shape:',
    '{',
    '"strengths": ["string"],',
    '"weaknesses": ["string"],',
    '"reasoning": "string",',
    '"score": 1',
    '}'
  ].join('\n');

  console.log(evalPrompt);

  const evalResponse = await runEval(evalPrompt, files);

  const tool_use_block = evalResponse?.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  const json_data = tool_use_block?.input;

  console.log(json_data);

  return JSON.stringify(json_data ?? {}) ?? 'No evaluation response';
}

async function runTestCase(prompt: string, filename: string): Promise<{ prompt: string; filename: string; strengths: string[]; weaknesses: string[]; reasoning: string; score: number }> {
  const answer = await runPrompt(prompt, filename);

  const evalResponse = await gradeByModel(prompt, [filename, 'output.csv'], answer);

  // console.log(evalResponse);

  const parsed = parseEvaluationPayload(evalResponse);

  return {
    "prompt": prompt,
    "filename": filename,
    "strengths": parsed.strengths,
    "weaknesses": parsed.weaknesses,
    "reasoning": parsed.reasoning,
    "score": parsed.score
  }

  // code grader is skipped due to complexity of 
  // implemeting generation of dataset with metadata 
  // (if you manually add column number of dataset file, 
  // and then read csv and compute column number after 
  // extraction you can use the compare as code grader 
  // score, and take the average of two.)
}

async function runEvalWorkflow(promptsJsonFilename: string, datasetJsonFilename: string): Promise<{ prompt: string; filename: string[]; strengths: string[]; weaknesses: string[]; reasoning: string[]; score: number }[]> {
  let result: { prompt: string; filename: string[]; strengths: string[]; weaknesses: string[]; reasoning: string[]; score: number }[] = [];

  const safePromptsFilename = path.basename(promptsJsonFilename);
  const destinationPrompts = path.join(INPUT_DIR_JSON, safePromptsFilename);
  const promptsJson = JSON.parse(readFileSync(destinationPrompts, 'utf8'));

  const safeDatasetFilename = path.basename(datasetJsonFilename);
  const destinationDataset = path.join(INPUT_DIR_JSON, safeDatasetFilename);
  const datasetJson = JSON.parse(readFileSync(destinationDataset, 'utf8'));
 
  let averageEvalResult : {
    "prompt": string,
    "filename": string[],
    "strengths": string[],
    "weaknesses": string[],
    "reasoning": string[],
    "score": number
  };
  let averageScore: number[]
  for (const prompt of promptsJson) {
    averageEvalResult = {
      "prompt": prompt,
      "filename": [],
      "strengths": [],
      "weaknesses": [],
      "reasoning": [],
      "score": 0
    }
    averageScore = [];
    for (const filename of datasetJson) {
      console.log(`Running test case with prompt: "${prompt.prompt}" and filename: "${filename.filename}"`);
      const evalResult = await runTestCase(prompt.prompt, filename.filename);
      averageEvalResult.filename.push(filename);
      for (const strength of evalResult.strengths)
        averageEvalResult.strengths.push(strength);
      for (const weakness of evalResult.weaknesses)
        averageEvalResult.weaknesses.push(weakness);
      averageEvalResult.reasoning.push(evalResult.reasoning); 
      averageScore.push(evalResult.score)    
    }
    averageEvalResult.score = averageScore.reduce((sum, current) => sum + current, 0) / averageScore.length;
    result.push(averageEvalResult);
  } 
  // console.log("Eval workflow completed. Results:", result);
  bashAgent.closeConnection();
  return result;
}

runEvalWorkflow('prompts.json', 'dataset.json').then((results) => {
  const safeFilename = path.basename('eval_results.json');
  const destination = path.join(OUTPUT_DIR_JSON, safeFilename);
  writeFile(destination, JSON.stringify(results, null, 2), (err) => {
    if (err) {  
      console.error('Error writing eval_results.json:', err);
    } else {
      console.log('Eval results written to eval_results.json');
    } 
  });
}).catch((error) => {
  console.error('Error during eval workflow:', error);
});


