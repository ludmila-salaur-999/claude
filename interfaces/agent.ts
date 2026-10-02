import { Message} from '../lib/message.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';

export interface Agent {
    startConversation(messages: Message[], tools: any[]): Promise<AnthropicMessage | undefined>;
    getTools(): Promise<any[]>;
    callTools(response: AnthropicMessage): Promise<any[]>;
    getAgent(): any;
    closeConnection(): Promise<void>;
}