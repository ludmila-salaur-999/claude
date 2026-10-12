import { getClient } from './client.js';
import { toFile } from '@anthropic-ai/sdk';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { mkdirSync, writeFile, readFileSync } from 'fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';

const anthropic = getClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

const OUTPUT_DIR_FILES = path.resolve(__dirname, '..', process.env.OUTPUT_DIR_FILES ?? 'output/files');
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

export async function copyFile(fileName: string, sourcePath: string, destinationPath: string): Promise<boolean> {
  const latestFile = await getLatestFile(sourcePath);
  if (latestFile && latestFile.name.indexOf('.pdf') !== -1 && 
    latestFile.name.indexOf(fileName.substring(0, fileName.indexOf('.pdf'))) !== -1 && 
    latestFile.mtime > new Date(Date.now() - 5 * 60 * 1000)) {
    const sourceFilePath = path.join(sourcePath, latestFile.name);
    const destinationFilePath = path.join(destinationPath, fileName);
    const fileContent = readFileSync(sourceFilePath, 'base64');
    writeFile(destinationFilePath, fileContent, 'base64', (err) => {
      if (err) {
        console.error(`Failed to copy ${fileName}:`, err);
        return;
      }
      console.log(`Copied: ${fileName} -> ${destinationFilePath}`);
    });
  } else {
    console.log(`No recent PDF file found for ${fileName} in ${sourcePath}`);
    return false;
  }
  return true;
}

interface FileInfo {
  name: string;
  path: string;
  mtime: Date; // Время последнего изменения файла
}

async function getLatestFile(dirPath: string): Promise<FileInfo | null> {
  try {
    const files = await fs.readdir(dirPath);
    
    if (files.length === 0) {
      return null;
    }

    // Собираем пути ко всем файлам
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);
        return { name: file, path: fullPath, stat };
      })
    );

    // Фильтруем, оставляя только файлы (исключаем поддиректории)
    const onlyFiles = fileStats.filter(item => item.stat.isFile());

    if (onlyFiles.length === 0) {
      return null;
    }

    // Находим файл с максимальным временем изменения (mtime)
    const latest = onlyFiles.reduce((latestFile, currentFile) => {
      return currentFile.stat.mtime > latestFile.stat.mtime ? currentFile : latestFile;
    });

    return {
      name: latest.name,
      path: latest.path,
      mtime: latest.stat.mtime
    };
  } catch (error) {
    console.error('Ошибка при поиске файла:', error);
    throw error;
  }
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
// copyFile('test.pdf', path.resolve(__dirname, '../../../Downloads'), path.resolve(__dirname, '../input/files'));