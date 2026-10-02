import { BashSession } from '../tools/bash_session.js';
import { addMessage, sendMessages } from './chat.js';
import { Message } from './message.js';
import { createBashSessionTool, createCodeExecutionTool, createEvaluationTool } from './tool.js';
import Anthropic from '@anthropic-ai/sdk';

const bashSession = new BashSession();

export async function startConversation(messages: Message[]) {
    console.log("Запуск диалога with Claude...");
    let keepGoing = true;
    console.log(messages);
    // 4. Запускаем бесконечный цикл обработки ответов (Agent Loop)
    while (keepGoing) {      
        const response = await sendMessages('claude-sonnet-5', messages, [...createBashSessionTool(), ...createEvaluationTool(), ...createCodeExecutionTool()]);
        console.log("Claude response: " + response.content);
        messages = await addMessage(messages, "assistant", response.content);

        // Если Клод решил, что для ответа нужно вызвать инструмент (tool_use)
        if (response.stop_reason === "tool_use") {        
            // const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
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
                            bashSession.restart();
                            result = "Bash session restarted";
                        } else if (input.command) {
                            // const validation = bashSession.validateCommand(input.command as string);
                            // if (!validation.ok) {
                            //     result = `Command validation failed: ${validation.reason}`;
                            // } else {
                                result = await bashSession.executeCommand(input.command as string);
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
            console.log("Tool results: ", toolResults);
            if (toolResults.length > 0) {
                messages = await addMessage(messages, "user", toolResults as Anthropic.ContentBlock[]);
            } else {
                console.log("No tool results to send back to Claude.");
                keepGoing = false; // Exit the loop if there are no tool results
                // bashSession.close();
                return response;
            }            
        } else {
            // Если стоп-сигнал не tool_use, значит Клод закончил работу и сформировал финальный ответ
            keepGoing = false;
            
            // Выводим финальный текстовый ответ
            // const textResponse = response.content.find(block => block.type === 'text');
            // if (textResponse && 'text' in textResponse) {
            //     console.log(`\nAnswer from Claude:\n${textResponse.text}`);
            // }
            // bashSession.close();
            return response; // Return the final response when the conversation ends
        }
    }
}    