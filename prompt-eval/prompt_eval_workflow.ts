import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFile } from 'fs';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { extract } from '../lib/extract.js';
import type { Message } from '../lib/chat.js';
import { addMessage, sendMessages } from '../lib/chat.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_DIR_JSON = path.resolve(__dirname, '..', 'prompt-eval/input/json');
const OUTPUT_DIR_JSON = path.resolve(__dirname, '..', 'prompt-eval/output/json');
mkdirSync(OUTPUT_DIR_JSON, { recursive: true });

async function runPrompt(prompt: string, filename: string): Promise<AnthropicMessage> {
  const answer = await extract(prompt, filename);
  return answer;
}

async function runEval(prompt: string, files: [string, string]): Promise<AnthropicMessage> {
  let messages: Message[] = [];
  messages = await addMessage(messages, "user", files, true, prompt);
  let answer = await sendMessages('claude-sonnet-5', messages, true);
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
    'Return ONLY valid JSON using double quotes and this exact schema:',
    '{',
    '  "strengths": ["string"],',
    '  "weaknesses": ["string"],',
    '  "reasoning": "string",',
    '  "score": 1',
    '}',
    'Keep it concise and direct.'
  ].join('\n');

  console.log(evalPrompt);

  const evalResponse = await runEval(evalPrompt, files);

  const tool_use_block = evalResponse.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  const json_data = tool_use_block?.input;

  console.log(json_data);

  return JSON.stringify(json_data ?? {}) ?? 'No evaluation response';
}

async function runTestCase(prompt: string, filename: string): Promise<{ prompt: string; filename: string; strengths: string[]; weaknesses: string[]; reasoning: string; score: number }> {
  const answer = await runPrompt(prompt, filename);

  const evalResponse = await gradeByModel(prompt, [filename, 'output.csv'], answer);

  console.log(evalResponse);

  const parsed = parseEvaluationPayload(evalResponse);

  return {
    "prompt": prompt,
    "filename": filename,
    "strengths": parsed.strengths,
    "weaknesses": parsed.weaknesses,
    "reasoning": parsed.reasoning,
    "score": parsed.score
  }
}

async function runEvalWorkflow(promptsJsonFilename: string, datasetJsonFilename: string): Promise<{ prompt: string; filename: string; strengths: string[]; weaknesses: string[]; reasoning: string; score: number }[]> {
  let result: { prompt: string; filename: string; strengths: string[]; weaknesses: string[]; reasoning: string; score: number }[] = [];

  const safePromptsFilename = path.basename(promptsJsonFilename);
  const destinationPrompts = path.join(INPUT_DIR_JSON, safePromptsFilename);
  const promptsJson = JSON.parse(readFileSync(destinationPrompts, 'utf8'));

  const safeDatasetFilename = path.basename(datasetJsonFilename);
  const destinationDataset = path.join(INPUT_DIR_JSON, safeDatasetFilename);
  const datasetJson = JSON.parse(readFileSync(destinationDataset, 'utf8'));
 
  for (const prompt of promptsJson) {
    for (const filename of datasetJson) {
      console.log(`Running test case with prompt: "${prompt.prompt}" and filename: "${filename.filename}"`);
      const evalResult = await runTestCase(prompt.prompt, filename.filename);
      result.push(evalResult);
    }
  } 
  // console.log("Eval workflow completed. Results:", result);
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


