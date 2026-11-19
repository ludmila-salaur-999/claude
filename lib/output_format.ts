import type { JSONOutputFormat } from '@anthropic-ai/sdk/resources/messages.mjs';

export const jsonOutputFormat: JSONOutputFormat = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "A mandatory status of the test report, e.g., 'Test passed.', 'Test failed.'."
      },    
      issues: {
        type: "array",
        description: "An optional array of issue objects, each containing issue type and issue details.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string"
            },
            details: {              
              type: "array",
              description: "An array of strings providing details about the specific issue.",
              items: { type: "string" }
            }
          },
          additionalProperties: false,
          required: ["type", "details"]
        }
      }
    },
    additionalProperties: false,
    required: ["status"]
  }
}