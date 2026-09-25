import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export function getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;

    if (!apiKey) {
        throw new Error(
            'Missing Claude API key. Set ANTHROPIC_API_KEY or CLAUDE_API_KEY in your environment or .env file.'
        );
    }

    return new Anthropic({ apiKey });
}