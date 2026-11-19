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

interface testStatusTool {
  "name": "report_test_results",
  "description": "Contains status of testing comparison of two files and captures any encountered differences.",
  "input_schema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "description": "A mandatory status of the test report, e.g., 'Test passed.', 'Test failed.'."
      },    
      "issues": {
        "type": "array",
        "description": "An optional array of issue objects, each containing issue type and issue details.",
        "items": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string"
            },
            "details": {              
              "type": "array",
              "description": "An array of strings providing details about the specific issue.",
              "items": { "type": "string" }
            }
          },
          "additionalProperties": false,
          "required": ["type", "details"]
        }
      }
    },
    "additionalProperties": false,
    "required": ["status"],
    "strict": true   
  }
}

export function createTestStatusTool(): testStatusTool[] {
    return [
        {
            "name": "report_test_results",
            "description": "Contains status of testing comparison of two files and captures any encountered differences.",
            "input_schema": {
                "type": "object",
                "properties": {
                "status": {
                    "type": "string",
                    "description": "A mandatory status of the test report, e.g., 'Test passed.', 'Test failed.'."
                },    
                "issues": {
                    "type": "array",
                    "description": "An optional array of issue objects, each containing issue type and issue details.",
                    "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                        "type": "string"
                        },
                        "details": {              
                        "type": "array",
                        "description": "An array of strings providing details about the specific issue.",
                        "items": { "type": "string" }
                        }
                    },
                    "additionalProperties": false,
                    "required": ["type", "details"]
                    }
                }
                },
                "additionalProperties": false,
                "required": ["status"],
                "strict": true   
            }
        }
    ]
}

interface bashSessionTool {
    type: "bash_20250124", 
    name: "bash"
}

export function createBashSessionTool() : bashSessionTool[] {
    return [
        {
            type: "bash_20250124", 
            name: "bash"
        }        
    ]
}

