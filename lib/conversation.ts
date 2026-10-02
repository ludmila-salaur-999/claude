import type { Message } from './message.js';
import { addMessage, sendMessages } from './chat.js';
import type { Message as AnthropicMessage } from '@anthropic-ai/sdk/resources/messages.mjs';
import { Agent } from '../interfaces/agent.js';
import Anthropic from '@anthropic-ai/sdk';

export abstract class Conversation implements Agent {

    abstract getTools(): Promise<any[]>;
    abstract callTools(response: AnthropicMessage): Promise<any[]>;
    abstract getAgent(): any;
    abstract closeConnection(): Promise<void>;

    async startConversation(messages: Message[], tools: any[]) : Promise<AnthropicMessage | undefined> {
        const agentTools = await this.getTools();
        console.log("Agent tools: ", agentTools);
        const allTools = [...agentTools, ...tools];
        console.log("All tools available for the conversation: ", allTools);

        console.log("Запуск диалога with Claude...");
        let keepGoing = true;

        // 4. Запускаем бесконечный цикл обработки ответов (Agent Loop)
        while (keepGoing) {    
            const response = await sendMessages("claude-sonnet-5", messages, allTools);
            messages = await addMessage(messages, "assistant", response.content);

            // Если Клод решил, что для ответа нужно вызвать инструмент (tool_use)
            if (response.stop_reason === "tool_use") {
                const toolResults = await this.callTools(response);
                console.log("Tool results: ", toolResults);
                if (toolResults.length > 0) {
                    messages = await addMessage(messages, "user", toolResults as Anthropic.ContentBlock[]);
                } else {
                    console.log("No tool results to send back to Claude.");
                    keepGoing = false; // Exit the loop if there are no tool results
                    return response;
                }                 
                // Цикл продолжается: на следующей итерации Клод получит результаты и решит, что делать дальше
                console.log("Отправка результатов обратно Клоду для следующего шага...");
            } else {
                // Если стоп-сигнал не tool_use, значит Клод закончил работу и сформировал финальный ответ
                keepGoing = false;
                return response; // Return the final response when the conversation ends
            }              
        } 
    }
}

// TODO fix file download location
// startConversation("Open http://localhost:8080/test.html, find table, extract all data as csv wide format one row per region with all metric columns and save as output2.csv in the workspace root nested folder prompt-eval nested folder output nested folder files.").catch(console.error);


