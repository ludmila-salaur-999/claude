import { getClient } from './client.js';
import { getMCPClient, closeMCPConnection } from './mcp_client.js';
import Anthropic from '@anthropic-ai/sdk';
import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

const anthropic = getClient();
const mcpClient = await getMCPClient();

async function getClaudeTools() {
    const { tools: mcpTools } = await mcpClient.listTools();
    
    // Трансформируем схему инструментов MCP под формат, который ожидает Claude API
    const claudeTools = mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Anthropic.Tool.InputSchema
    }));

    return claudeTools;
}

export async function startConversation() {
    const claudeTools = await getClaudeTools();
    let messages: Message[] = [];
    messages = await addMessage(messages, "user", "Open http://localhost:8080/test.html, find table, extract all data as csv wide format one row per region with all metric columns and save as output2.csv in the workspace root nested folder prompt-eval nested folder output nested folder files.");

    console.log("Запуск диалога with Claude...");
    let keepGoing = true;

    // 4. Запускаем бесконечный цикл обработки ответов (Agent Loop)
    while (keepGoing) {    
        const response = await sendMessages("claude-sonnet-5", messages, false, claudeTools);
        messages = await addMessage(messages, "assistant", response.content);

        // Если Клод решил, что для ответа нужно вызвать инструмент (tool_use)
        if (response.stop_reason === "tool_use") {
            const toolResultsBlocks = await callTools(response);

            messages = await addMessage(messages, "user", toolResultsBlocks);

            // Цикл продолжается: на следующей итерации Клод получит результаты и решит, что делать дальше
            console.log("Отправка результатов обратно Клоду для следующего шага...");

        } else {
            // Если стоп-сигнал не tool_use, значит Клод закончил работу и сформировал финальный ответ
            keepGoing = false;
            
            // Выводим финальный текстовый ответ
            const textResponse = response.content.find(block => block.type === 'text');
            if (textResponse && 'text' in textResponse) {
                console.log(`\nAnswer from Claude:\n${textResponse.text}`);
            }
        }              
    } 

    await closeMCPConnection();
}

async function callTools(response: AnthropicMessage) {
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

// TODO fix file download location
// startConversation().catch(console.error);


