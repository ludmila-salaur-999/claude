import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"]
});

export async function getMCPClient() : Promise<Client> {
    const mcpClient = new Client({
        name: "claude-playwright-runner",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    console.log("Подключение к MCP серверу...");
    await mcpClient.connect(transport);

    return mcpClient;
}

export async function closeMCPConnection() {
    // 5. Корректно закрываем соединение с MCP сервером
    await transport.close();
    console.log("\nConnection closed.");
}