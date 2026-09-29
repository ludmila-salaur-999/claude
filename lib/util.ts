import Anthropic from '@anthropic-ai/sdk';

// 1. Define a type guard for a single ContentBlock
function isContentBlock(obj: any): obj is Anthropic.ContentBlock {
  if (!obj || typeof obj !== 'object') return false;
  
  // Anthropic content blocks always have a 'type' property 
  // e.g., 'text', 'image', 'tool_use', 'tool_result', or 'thinking'
  const validTypes = ['text', 'image', 'tool_use', 'tool_result', 'thinking', 'redacted_thinking'];
  
  return typeof obj.type === 'string' && validTypes.includes(obj.type);
}

// 2. Define the type guard for the array: ContentBlock[]
export function isContentBlockArray(variable: unknown): variable is Anthropic.ContentBlock[] {
  return Array.isArray(variable) && variable.every(isContentBlock);
}