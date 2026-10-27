import { MCPAgent } from "../agents/mcp_agent.js";
import { Message } from "../lib/message.js";
import { addMessage } from "../lib/chat.js";

export async function runMCPWorkflow(): Promise<void> {
    const agent = new MCPAgent();
    let messages: Message[] = [];
    let prompt = "Open http://localhost:8080/test_viewport.html, extract table from web page into generated output csv as csv table data only wide data format one row per region matched to existing column names split into neighbouring columns where applies with exactly same group member column name each (e.g. header group R1/Q1 should be split into R1 and Q1) and save as 'output2.csv' in workspace root only one time and stop further calls.";
    messages = await addMessage(messages, "user", prompt);
    await agent.startConversation(messages, []);
    if (!agent.isClosed())
        await agent.closeConnection();
}  

runMCPWorkflow().catch(console.error);