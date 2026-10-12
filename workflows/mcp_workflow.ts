import { MCPAgent } from "../agents/mcp_agent.js";
import { Message } from "../lib/message.js";
import { addMessage } from "../lib/chat.js";

export async function runMCPWorkflow(): Promise<void> {
    const agent = new MCPAgent();
    let messages: Message[] = [];
    let prompt = "Use Playwright MCP to open http://localhost:8080/test.html, find table, extract all data as csv wide format one row per region with all metric columns and save as output2.csv in the one folder up the workspace root nested folder output nested folder files.";
    messages = await addMessage(messages, "user", prompt);
    await agent.startConversation(messages, []);
    // prompt = "Use Playwright MCP to find button Download as PDF and click it.";
    // messages = [];
    // messages = await addMessage(messages, "user", prompt);
    // await agent.startConversation(messages, []);
    await agent.closeConnection();
}  

// runMCPWorkflow().catch(console.error);