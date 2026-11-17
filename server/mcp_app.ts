import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import { createInterface } from 'node:readline/promises';
import { execPath, stdin, stdout } from 'node:process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getClient } from '../lib/client.js';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(appDirectory, '..');
const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';
const maxToolRounds = 12;
const mcpRequestTimeoutMs = 300_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getToolText(result: unknown): string {
  if (!isRecord(result) || !Array.isArray(result.content)) {
    throw new Error('The MCP tool returned an invalid result without a content array.');
  }

  return result.content
    .map((block: unknown) => {
      if (isRecord(block) && block.type === 'text' && typeof block.text === 'string') {
        return block.text;
      }
      return JSON.stringify(block);
    })
    .join('\n');
}

function isToolError(result: unknown): boolean {
  return isRecord(result) && result.isError === true;
}

export async function executePrompt(prompt: string): Promise<void> {
  if (!prompt.trim()) {
    throw new Error('Enter a prompt to run.');
  }

  const transport = new StdioClientTransport({
    command: execPath,
    args: [
      path.join(projectDirectory, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.join(appDirectory, 'mcp_server.ts'),
    ],
    cwd: projectDirectory,
  });
  const mcpClient = new Client(
    { name: 'scenario-pdf-prompt-app', version: '1.0.0' },
    { capabilities: {} }
  );
  const anthropic = getClient();

  try {
    await mcpClient.connect(transport);
    const { tools: mcpTools } = await mcpClient.listTools();
    if (mcpTools.length === 0) {
      throw new Error('The configured MCP server did not advertise any tools.');
    }

    const tools: Anthropic.Tool[] = mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? '',
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));
    const messages: MessageParam[] = [
      {
        role: 'user',
        content:
          `Execute this request using the available scenario PDF MCP tools. ` +
          `Call the tools when needed and report their results accurately.\n\n${prompt}`,
      },
    ];

    for (let round = 0; round < maxToolRounds; round += 1) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        tools,
        messages,
      });

      if (response.stop_reason !== 'tool_use') {
        const finalText = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n');
        stdout.write(`${finalText || 'The assistant returned no text.'}\n`);
        return;
      }

      messages.push({ role: 'assistant', content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') {
          continue;
        }

        stdout.write(`Calling MCP tool: ${block.name}\n`);
        if (!isRecord(block.input)) {
          throw new Error(`The model returned invalid arguments for MCP tool "${block.name}".`);
        }

        const result = await mcpClient.callTool({
          name: block.name,
          arguments: block.input,
        }, undefined, { timeout: mcpRequestTimeoutMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: getToolText(result),
          ...(isToolError(result) ? { is_error: true } : {}),
        });
      }

      if (toolResults.length === 0) {
        throw new Error('The model requested tool use but returned no tool calls.');
      }
      messages.push({ role: 'user', content: toolResults });
    }

    throw new Error(`Stopped after reaching the ${maxToolRounds}-round tool-call limit.`);
  } finally {
    await mcpClient.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let prompt = args.join(' ').trim();

  if (!prompt) {
    const terminal = createInterface({ input: stdin, output: stdout });
    try {
      prompt = (await terminal.question('What would you like the MCP server to do? ')).trim();
    } finally {
      terminal.close();
    }
  }

  await executePrompt(prompt);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error('MCP app failed:', error);
    process.exitCode = 1;
  });
}