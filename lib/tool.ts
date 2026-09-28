export type Tool = codeExecutionTool[] | (evaluationTool | codeExecutionTool)[]

interface codeExecutionTool {
    type: "code_execution_20250825",
    name: "code_execution"  
}

export function createCodeExecutionTool() : codeExecutionTool[] {
    return [
        {
            type: "code_execution_20250825",
            name: "code_execution"  
        }        
    ]
}

interface evaluationTool {
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
}

export function createEvaluationTool() : evaluationTool[] {
    return [
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
        }        
    ]
}

