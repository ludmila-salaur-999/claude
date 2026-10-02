import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import Anthropic from '@anthropic-ai/sdk';
import { Conversation } from '../lib/conversation.js';
import { addMessage } from '../lib/chat.js';
import type { Message } from '../lib/message.js';

const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"]
});

const mcpClient = new Client({
    name: "claude-playwright-runner",
    version: "1.0.0"
}, {
    capabilities: {}
});

export class MCPAgent extends Conversation {

    constructor() {
        super();
        this.start();
    }

    private async start() : Promise<void> {
        console.log("Подключение к MCP серверу...");
        await mcpClient.connect(transport);
    }  

    async getAgent() {
        return mcpClient;
    }

    async closeConnection() {
        // 5. Корректно закрываем соединение с MCP сервером
        await transport.close();
        console.log("\nConnection closed.");
    }  
    
    async getTools() : Promise<any[]> {
        const { tools: mcpTools } = await mcpClient.listTools();
        
        // Трансформируем схему инструментов MCP под формат, который ожидает Claude API
        const claudeTools = mcpTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema as Anthropic.Tool.InputSchema
        }));

        return claudeTools;
    } 
    
    async callTools(response: AnthropicMessage) {
        const toolResultsBlocks: any[] = [];
        // Проходим по всем блокам ответа (Клод может вызвать несколько инструментов параллельно)
        for (const block of response.content) {
            if (block.type === "tool_use") {
                console.log(`\nClaude запрашивает инструмент: [${block.name}]`);
                console.log(`Аргументы:`, JSON.stringify(block.input));

                try {
                    // Вызываем инструмент непосредственно на нашем MCP сервере
                    const result = await mcpClient.callTool({
                        name: block.name,
                        arguments: block.input as Record<string, unknown>
                    }) as CallToolResult;

                    // Форматируем контент ответа инструмента для API Клода
                    const toolContent = result.content.map((c: any) => {
                        if (c.type === 'text') return { type: 'text' as const, text: c.text };
                        return { type: 'text' as const, text: JSON.stringify(c) };
                    });

                    // Формируем блок ответа для отправки обратно в LLM
                    toolResultsBlocks.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: toolContent
                    });

                } catch (error: any) {
                    console.error(`Ошибка выполнения инструмента ${block.name}:`, error);
                    toolResultsBlocks.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: [{ type: "text", text: `Error: ${error.message}` }],
                        is_error: true
                    });
                }
            }
        }

        return toolResultsBlocks;
    }    
}

async function main() {
    const agent = new MCPAgent();
    let messages: Message[] = [];
    const prompt = "Open http://localhost:8080/test.html, find table, extract all data as csv wide format one row per region with all metric columns and save as output2.csv in the workspace root nested folder output nested folder files.";
    messages = await addMessage(messages, "user", prompt);
    await agent.startConversation(messages, []);
}    

main().catch(console.error);