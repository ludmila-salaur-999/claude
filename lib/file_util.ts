import { getClient } from './client.js';
import { toFile } from '@anthropic-ai/sdk';
import { createReadStream } from 'fs';

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