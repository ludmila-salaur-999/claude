import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

async function runMcpWorkflow() {
    // 1. Инициализируем клиент Anthropic (ключ автоматически берется из process.env.ANTHROPIC_API_KEY)
    const anthropic = new Anthropic();

    // 2. Настраиваем транспорт для подключения к Playwright MCP серверу
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

    console.log("Подключение к MCP серверу...");
    await mcpClient.connect(transport);

    // 3. Получаем список доступных инструментов от MCP сервера
    const { tools: mcpTools } = await mcpClient.listTools();
    
    // Трансформируем схему инструментов MCP под формат, который ожидает Claude API
    const claudeTools = mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Anthropic.Tool.InputSchema
    }));

    // Исходный промт для Клода
    const messages: Anthropic.MessageParam[] = [{
        role: "user",
        content: "Open http://localhost:8080/test.html, find table, extract all data as csv wide format one row per region with all metric columns and save as output2.csv in the workspace root nested folder prompt-eval nested folder output nested folder files."
    }];

    console.log("Запуск диалога with Claude...");
    let keepGoing = true;

    // 4. Запускаем бесконечный цикл обработки ответов (Agent Loop)
    while (keepGoing) {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-5",
            max_tokens: 4096,
            tools: claudeTools,
            messages: messages
        });

        // Добавляем ответ ассистента в общую историю сообщений
        messages.push({ role: "assistant", content: response.content });

        // Если Клод решил, что для ответа нужно вызвать инструмент (tool_use)
        if (response.stop_reason === "tool_use") {
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

            // Добавляем результаты выполнения инструментов в историю как сообщение от пользователя
            messages.push({
                role: "user",
                content: toolResultsBlocks
            });

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

    // 5. Корректно закрываем соединение с MCP сервером
    await transport.close();
    console.log("\nConnection closed.");
}

runMcpWorkflow().catch(console.error);
