import { MCPAgent } from "../agents/mcp_agent.js";
import { Message } from "../lib/message.js";
import { addMessage } from "../lib/chat.js";

export async function runMCPWorkflow(): Promise<void> {
    const agent = new MCPAgent();
    let messages: Message[] = [];
    let prompt = "Open http://localhost:8080/test.html, and save full page screenshot as output.png only one time and stop further calls.";//extract all data from table as csv wide format one row per region with all metric columns into 'output2.csv', and stop immediately. Never close tabs or the browser, and never try to verify cleanup. Resources are cleaned up automatically when the session ends. When the task is done, reply with a final text summary and make no further tool calls.";
    messages = await addMessage(messages, "user", prompt);
    await agent.startConversation(messages, []);
    if (!agent.isClosed())
        await agent.closeConnection();
}  

// runMCPWorkflow().catch(console.error);