import { Message} from '../lib/message.js';
import type { Message as AnthropicMessage, JSONOutputFormat } from '@anthropic-ai/sdk/resources/messages.mjs';

export interface Agent {
    startConversation(messages: Message[], tools: any[], output_config?: JSONOutputFormat): Promise<AnthropicMessage | undefined>;
    getTools(): Promise<any[]>;
    callTools(response: AnthropicMessage): Promise<any[]>;
    getAgent(): any;
    isClosed(): boolean;
    closeConnection(): Promise<void>;
}