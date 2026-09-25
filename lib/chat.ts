import { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import 'dotenv/config'; // Automatically loads your .env file
import { mkdirSync, readFileSync, writeFile } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getClient } from './client.js';
import { uploadFile, deleteFiles } from './file_util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', 'prompt-eval/output/files');
mkdirSync(OUTPUT_DIR_FILES, { recursive: true });
const INPUT_DIR_FILES = path.resolve(__dirname, '..', 'prompt-eval/input/files');

const anthropic = getClient();

export type Tools = [
  {
      type: "code_execution_20250825",
      name: "code_execution"  
  }
] | [
  {
    "name": "submit_evaluation",
    "description": "Отправляет структурированную оценку ответа ИИ в формате JSON.",
    "input_schema": {
        "type": "object",
        "properties": {
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Список из 1-3 ключевых сильных сторон ответа"
            },
            "weaknesses": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Список из 1-3 ключевых слабых сторон или зон для улучшения"
            },
            "reasoning": {
                "type": "string",
                "description": "Краткое обоснование общей оценки"
            },
            "score": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10,
                "description": "Оценка от 1 до 10"
            }
        },
        "required": ["strengths", "weaknesses", "reasoning", "score"]
    }
  },
  {
      type: "code_execution_20250825",
      name: "code_execution"  
  }  
]

export type Message = {
  role: "user" | "assistant";
  content: string | [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: string,
        },
      },
      {
        type: "text",
        text: string,
      }
    ] | [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: string,
        }
      },      
      {
        type: "container_upload",
        file_id: string,
      },
      {
        type: "text",
        text: string,
      },      
    ]
}

let uploadedFileID: string | undefined;
export async function addMessage(messages: Message[], role: "user" | "assistant", content: string | [string, string], isFile: boolean = false, text?: string): Promise<Message[]> {
  let newMessage: Message;
  let safeFilename: string = "";
  let destinationFile: string = "";
  if (isFile && !Array.isArray(content)) {
    safeFilename = path.basename(content);
    destinationFile = path.join(INPUT_DIR_FILES, safeFilename);
    const fileContent = readFileSync(destinationFile, "base64");
    newMessage = { role, content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileContent } }, { type: "text", text: text ?? "" }] };
  } else if (!Array.isArray(content)) {
    newMessage = { role, content };
  } else {
    safeFilename = path.basename(content[0]);
    destinationFile = path.join(INPUT_DIR_FILES, safeFilename);
    const fileContent = readFileSync(destinationFile, "base64");
    safeFilename = path.basename(content[1]);
    destinationFile = path.join(OUTPUT_DIR_FILES, safeFilename);    
    uploadedFileID = await uploadFile(destinationFile);
    newMessage = { role, content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileContent } }, { type: "container_upload", file_id: uploadedFileID }, { type: "text", text: text ?? "" }] };
  }
  // console.log(JSON.stringify(messages, null, 2));
  return [...messages, newMessage];
}

function saveGeneratedFile(filename: string, buffer: Buffer): void {
  const safeFilename = path.basename(filename);
  const destination = path.join(OUTPUT_DIR_FILES, safeFilename);

  writeFile(destination, buffer, (err) => {
    if (err) {
      console.error(`Failed to save ${safeFilename}:`, err);
      return;
    }
    console.log(`Downloaded: ${safeFilename} -> ${destination}`);
  });
}

function createFullMessage(model: string, messages: Message[], forceJson: boolean = false, temperature: number = 0.7, stop_sequences: string[] = ["```"]): MessageCreateParamsNonStreaming {
  const tools: Tools = forceJson
    ? [
        {
          name: "submit_evaluation",
          description: "Отправляет структурированную оценку ответа ИИ в формате JSON.",
          input_schema: {
            type: "object",
            properties: {
              strengths: {
                type: "array",
                items: { type: "string" },
                description: "Список из 1-3 ключевых сильных сторон ответа"
              },
              weaknesses: {
                type: "array",
                items: { type: "string" },
                description: "Список из 1-3 ключевых слабых сторон или зон для улучшения"
              },
              reasoning: {
                type: "string",
                description: "Краткое обоснование общей оценки"
              },
              score: {
                type: "integer",
                minimum: 1,
                maximum: 10,
                description: "Оценка от 1 до 10"
              }
            },
            required: ["strengths", "weaknesses", "reasoning", "score"]
          }
        },
        {
          type: "code_execution_20250825",
          name: "code_execution"
        }
      ]
    : [
        {
          type: "code_execution_20250825",
          name: "code_execution"
        }
      ];
  return {
    model: model,
    max_tokens: 1024,
    messages: messages,
    temperature: temperature,
    // stop_sequences: stop_sequences, 
    // system: system,
    tools: tools
    // TODO add forceJson clause if needed
  };
}

function createShortMessage(model: string, messages: Message[], forceJson: boolean = false): MessageCreateParamsNonStreaming {
  const tools: Tools = forceJson
    ? [
        {
          name: "submit_evaluation",
          description: "Отправляет структурированную оценку ответа ИИ в формате JSON.",
          input_schema: {
            type: "object",
            properties: {
              strengths: {
                type: "array",
                items: { type: "string" },
                description: "Список из 1-3 ключевых сильных сторон ответа"
              },
              weaknesses: {
                type: "array",
                items: { type: "string" },
                description: "Список из 1-3 ключевых слабых сторон или зон для улучшения"
              },
              reasoning: {
                type: "string",
                description: "Краткое обоснование общей оценки"
              },
              score: {
                type: "integer",
                minimum: 1,
                maximum: 10,
                description: "Оценка от 1 до 10"
              }
            },
            required: ["strengths", "weaknesses", "reasoning", "score"]
          }
        },
        {
          type: "code_execution_20250825",
          name: "code_execution"
        }
      ]
    : [
        {
          type: "code_execution_20250825",
          name: "code_execution"
        }
      ];
  return forceJson ? {
    model: model,
    max_tokens: 3024,
    thinking: {
      type: "disabled"
    },
    messages: messages,
    tools: tools,
    tool_choice: {"type": "tool", "name": "submit_evaluation"},
  } : {
    model: model,
    max_tokens: 3024,
    thinking: {
      type: "disabled"
    },
    messages: messages,
    tools: tools
  };
}

export async function sendMessages(model: string, messages: Message[], forceJson: boolean = false, temperature?: number, stop_sequences?: string[]): Promise<AnthropicMessage> {
  let fullMessage: MessageCreateParamsNonStreaming;
  if (temperature !== undefined && stop_sequences !== undefined) {
    fullMessage = createFullMessage(model, messages, forceJson, temperature, stop_sequences);
  } else {
    fullMessage = createShortMessage(model, messages, forceJson);
  }

  const answer = await anthropic.messages.create(fullMessage);

  // console.log('Non-stream response content blocks:', JSON.stringify(answer.content, null, 2));
  // console.log(answer.content[0].type === "text" ? answer.content[0].text : answer.content[0].type);
  
  // Extract the file IDs from the response and download each created file
  for (const block of answer.content) {
    if (block.type === "bash_code_execution_tool_result") {
      const result = block.content;
      if (result.type === "bash_code_execution_result") {
        for (const outputBlock of result.content) {
          const [fileMetadata, fileResponse] = await Promise.all([
            anthropic.files.retrieveMetadata(outputBlock.file_id),
            anthropic.files.download(outputBlock.file_id)
          ]);
          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          saveGeneratedFile(fileMetadata.filename, buffer);
        }
      }
    }
  }
  
  if (uploadedFileID) {
    await deleteFiles(uploadedFileID);
    uploadedFileID = undefined;
  }

  return answer;
}

async function answerAsStream(messages: Message[], temperature: number = 0): Promise<void> {
  const stream = anthropic.messages.stream({ 
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: messages,
    temperature: temperature,
    // system: 'You are a developer that gives very concise answers on IT subjects.',
    // stop_sequences: ["```"],
    tools: [
      {
        type: "code_execution_20250825",
        name: "code_execution"
      }
    ]
  });

  // 1. Listen for individual text chunks as they arrive
  stream.on('text', (textChunk: string) => {
    process.stdout.write(textChunk);
  });

  // 2. Listen for the completion of the message
  stream.on('finalMessage', (message) => {
    console.log('\n\n--- Stream Completed ---');
    console.log(`Usage tokens -> Input: ${message.usage.input_tokens}, Output: ${message.usage.output_tokens}`);
  });

  // 3. Optional: Wait for the entire stream to finish executing
  const msg = await stream.finalMessage();
  // console.log('Stream final message content blocks:', JSON.stringify(msg.content, null, 2));
 
  // Extract the file IDs from the response and download each created file
  for (const block of msg.content) {
    if (block.type === "bash_code_execution_tool_result") {
      const result = block.content;
      if (result.type === "bash_code_execution_result") {
        for (const outputBlock of result.content) {
          const [fileMetadata, fileResponse] = await Promise.all([
            anthropic.files.retrieveMetadata(outputBlock.file_id),
            anthropic.files.download(outputBlock.file_id)
          ]);
          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          saveGeneratedFile(fileMetadata.filename, buffer);
        }
      }
    }
  }
}