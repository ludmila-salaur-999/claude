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
        for (const file in files) {
            await anthropic.beta.files.delete(file);
        }
    } else {
        await anthropic.beta.files.delete(files);
    }
}

const files = [
    'file_0149N2c4u6KZJKKxFBuf2rLa',
    'file_01DouQKR7Ranna9wFpAhy5k2',
    'file_01LEeNDRvEZEFoxXrH8fEhob',
    'file_01A9hdnF56BGpwnBmNytWVfv',
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
    'file_01DvUxkbMoB43gMc5sAfqepA'
]

// listFiles();