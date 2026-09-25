import { getClient } from '../lib/client.js';
import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '../lib/chat.js';
import { addMessage, sendMessages } from '../lib/chat.js';

const anthropic = getClient();

// # 2. Формируем ваш промпт
const prompt_text = 
"You are an expert secretary assistant. Your task is to evaluate the quality of AI response for given task:\n" + 
  "Original task:\n" +
  "<task>\n" + 
  "Extract table from pdf document into generated output csv only wide data file as 'output.csv'. The pdf is attached as base64 encoded string." +
  "\n</task>\n" +
  "<input>\n" +
  "Attached pdf file 'test10.pdf'\n" +
  "</input>\n" +

  "AI response to evaluate:\n" +
  "<text>\n" +
  "I'll extract the table data from the PDF and create a CSV file in wide format." +
  "\n</text>\n" +
  "<output>\n" +
  "Uploaded AI generated CSV file 'output.csv'\n" +
  "</output>\n" +
  "Evaluation format:\n" +
  "Provide your evaluation as structured JSON object with following fields:\n" +
  "- 'strengths': An array of 1-3 key strengths\n" +
  "- 'weaknesses': An array of 1-3 key areas for improvement\n" +
  "- 'reasoning': A concise explanation of your overall assessment\n" +
  " - 'score': A number between 1-10\n" +
  "Respond with JSON. Keep your response consise and direct.\n" +
  "Example response shape:\n" +
  "{\n" +
  "   'strengths': string[],\n" +
  "   'weaknesses': string[],\n" +
  "   'reasoning': string,\n" +
  "   'score': number\n" +
  "}\n"

let messages: Message[] = [];
messages = await addMessage(messages, "user", ["test10.pdf", "output.csv"], true, prompt_text);
// let answer = await sendMessages('claude-sonnet-5', messages);

// # 3. Делаем запрос к API с принудительным вызовом
const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    tools: [
        {
            "name": "submit_evaluation",
            "description": "Отправляет структурированную оценку ответа ИИ в формате JSON.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "strengths": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Список из 1-3 ключевых сильных сторон ответа"
                    },
                    "weaknesses": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Список из 1-3 ключевых слабых сторон или зон для улучшения"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Краткое обоснование общей оценки"
                    },
                    "score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 10,
                        "description": "Оценка от 1 до 10"
                    }
                },
                "required": ["strengths", "weaknesses", "reasoning", "score"]
            }
        },
        {
            type: "code_execution_20250825",
            name: "code_execution"  
        }
    ],
    // # ЭТОТ ПАРАМЕТР ЗАСТАВЛЯЕТ CLAUDE ВЫЗВАТЬ ИМЕННО ЭТОТ ИНСТРУМЕНТ:
    tool_choice: {"type": "tool", "name": "submit_evaluation"},
    messages: messages
});

// # 4. Извлекаем чистый JSON из аргументов инструмента
const tool_use_block = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
);
const json_data = tool_use_block?.input;

console.log(json_data);
// # Результат будет чистым словарем/JSON: 
// # {'strengths': [...], 'weaknesses': [...], 'reasoning': '...', 'score': X}
// {
//   strengths: [
//     "File was generated in the requested CSV format as 'output.csv'",
//     'Task acknowledgment suggests intent to extract table data correctly'
//   ],
//   weaknesses: [
//     'No verification was performed to confirm the CSV content matches the source PDF table data (values for M1, M2, and Total columns per region)',
//     "No confirmation that the data is in 'wide' format as specifically requested (each region as one row with separate columns for M1 value/count, M2 value/count, and Total, rather than a long/melted format)",
//     'The response text is minimal and does not show the actual extracted data or any validation step, making it hard to assess accuracy without directly inspecting the file'
//   ],
//   reasoning: "The AI response claims to have extracted the table and produced 'output.csv', fulfilling the basic file-naming and format request. However, sinceI cannot directly inspect the uploaded CSV's contents in this evaluation context, I must rely on the response's transparency and process quality. The response provides no visible output, verification, or explanation of how the two numeric values per cell (e.g., '197' and '5800.92' under M1) were handled in wide format- whether as separate columns, concatenated, or only one was kept. This ambiguity is significant given the PDF's unusual structure (each cell contains two stacked numbers). Without seeing the actual CSV content or any confirmation of correctness, the response's quality cannot be fully validated, and the lack of any summary or preview of the extracted data reduces confidence in accuracy and completeness.",
//   score: 5
// }