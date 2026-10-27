import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import Anthropic from '@anthropic-ai/sdk';
import { Conversation } from '../lib/conversation.js';

const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@playwright/mcp@latest", "--headless", "--isolated"]
});

const mcpClient = new Client({
    name: "playwright-eager-server",//"claude-playwright-runner",
    version: "1.0.0"
}, {
    capabilities: {},
});

const stopConnectionTools: string[] = ["browser_close", "browser_tabs", "browser_navigate_back", "browser_wait_for", "browser_find"];
const disallowedTools: string[] = ["browser_evaluate", "browser_network_requests", "browser_network_request", "browser_console_messages"];

export class MCPAgent extends Conversation {

    private isClosed_ = true;

    constructor() {
        super();
        this.start();
        this.isClosed_ = false;
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
        console.log("\nMCP Connection closed.");
        this.isClosed_ = true;
    }  

    isClosed() {
        return this.isClosed_;
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
                console.error(`\nClaude запрашивает инструмент: [${block.name}]`);
                console.error(`Аргументы:`, JSON.stringify(block.input));

                if (stopConnectionTools.includes(block.name)) {
                    // toolResultsBlocks.push({
                    //     type: "tool_result",
                    //     tool_use_id: block.id,
                    //     content: `Tool [${block.name}] is not in the allowlist`
                    // });
                    console.error("Closing connection...");
                    await this.closeConnection();                    
                } else if (disallowedTools.includes(block.name)) { 
                    // console.error("Closing connection...");
                    // await this.closeConnection();
                    toolResultsBlocks.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: `Tool [${block.name}] is not in the allowlist`
                    });                    
                } else {
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
        }

        return toolResultsBlocks;
    }    
}