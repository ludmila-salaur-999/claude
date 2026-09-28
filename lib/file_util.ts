import { getClient } from './client.js';
import { toFile } from '@anthropic-ai/sdk';
import { createReadStream } from 'fs';
import { mkdirSync, writeFile } from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';

const anthropic = getClient();

export async function uploadFile(filename: string) : Promise<string> {
    const uploaded = await anthropic.files.upload({
        file: await toFile(
            createReadStream(filename),
            undefined,
            { type: "text/csv" }
        )
    });
    console.log(uploaded.id);
    return uploaded.id;
}

export async function downloadFile(answer: AnthropicMessage) {
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
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', 'prompt-eval/output/files');
mkdirSync(OUTPUT_DIR_FILES, { recursive: true });
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

export async function listFiles() {
    const files = await anthropic.files.list();
    console.log(files);
}

export async function deleteFiles(files: string | string[]) {
    if (Array.isArray(files)) {
        for (const file of files) {
            try {
                console.log(file);
                await anthropic.beta.files.delete(file);
                console.log(`${file} deleted!`);
            } catch (error) {
                console.log(`${file} is not deleted!`);
            }
        }
    } else {
        await anthropic.beta.files.delete(files);
    }
}

const files: string[] = [
    'file_01HVSHcGATE31GQyCG2jCQCe',
    'file_01XpgK6W6fgWN2vnpxwf5oUL',
    'file_01R8w1dRDu78qW4kDUv1uGXT',
    'file_013XDfAe1j1JhSxiLxNcCKxN',
    'file_01SfX3btrvyLD6HXBd7nSzei',
    'file_012BXdb1Du3zEkQakBiK7BHT',
    'file_01XhaFJze5Z5u43Xkk87bQdp',
    'file_01Ddnu7KzVWe7yxKhdQ3snyo',
    'file_016UBCRz62jEhbmimyZfBrEX',
    'file_01VWmu2gwrf25icM2w1HvKB3',
    'file_01NYFm35ZkZwy92qev9hg9UP',
    'file_01UAhqSfK9Q5Q2WegtoiLGSs',
    'file_01Kq2PskPCViQwGoh556rgzH',
    'file_01JWiRjaUovEqJxi3caKcfu6',
    'file_01DvUxkbMoB43gMc5sAfqepA',
    'file_0169KdZ3BnkpHw2HNexBPa1H',
    'file_01APjg3Z3BTAs5CCVYdousKK',
    'file_0159o1FDXtgt8A4s2EpyKR5T',
    'file_015ECqsHFjCBFa3U844JhYuG',
    'file_01V8zVDJnnMpj4GeXRSJ471m'
]

// listFiles();
// deleteFiles(files);