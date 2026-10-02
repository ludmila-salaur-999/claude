import { Conversation } from '../lib/conversation.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { BashSession } from '../tools/bash_session.js';
import { createBashSessionTool } from '../lib/tool.js';

export class BashAgent extends Conversation {

    private bashSession: BashSession | undefined;

    constructor() {
        super();
        this.start();
    }

    private start(): void {
        console.log("Starting Bash Agent...");
        this.bashSession = new BashSession();
    }

    async getAgent() {
        return this.bashSession;
    }

    async closeConnection() {
        console.log("Closing Bash Agent connection...");
        this.bashSession?.close();
    }   

    async getTools(): Promise<any[]> {
        // Return the tools available for the BashAgent
        return createBashSessionTool();
    }  
    
    async callTools(response: AnthropicMessage): Promise<any[]> {
        const toolResults: unknown[] = [];
        for (const block of response.content) {
            // console.log("Processing block: " + block.type + " " + block.name + ", Input: " + block.input);
            if (block.type === "tool_use" && block.name === "bash") {
                try {
                    let result: string = "Cannot execute command.";
                    const input = block.input as Record<string, unknown>;
                    console.log(input);
                    // return; // Exit the function after logging the input for debugging
                    if (input.restart) {
                        this.bashSession?.restart();
                        result = "Bash session restarted";
                    } else if (input.command) {
                        // const validation = bashSession.validateCommand(input.command as string);
                        // if (!validation.ok) {
                        //     result = `Command validation failed: ${validation.reason}`;
                        // } else {
                            result = await this.bashSession?.executeCommand(input.command as string) ?? "Cannot execute command.";
                        // }
                    }
                    // One tool_result per tool_use block, all returned in the next user message
                    toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
                } catch (error: any) {
                    console.error(`Ошибка выполнения инструмента ${block.name}:`, error);
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: [{ type: "text", text: `Error: ${error.message}` }],
                        is_error: true
                    });
                }
            }
        }
        return toolResults;                  
    }
}