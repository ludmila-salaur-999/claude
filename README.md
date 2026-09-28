# Project Setup Guide

This project is set up for TypeScript, Anthropic API access, and a local static HTML page.

## 1) Install Node.js and npm

Install Node.js from https://nodejs.org/ and confirm it is available:

```bash
node -v
npm -v
```

## 2) Install TypeScript in the project

From the project root:

```bash
npm install
npm install -D typescript ts-node tsx @types/node
```

Optional global install:

```bash
npm install -g typescript
```

## 3) Install Anthropic / Claude packages

Install the SDK used for API requests and the MCP SDK:

```bash
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk
```

Install the Claude Code CLI if you want to use the Claude tooling locally:

```bash
npm install -g @anthropic-ai/claude-code
```

After installation, verify the CLI is available:

```bash
claude --version
```

## 4) Install Playwright

Install Playwright for browser automation and the MCP browser server:

```bash
npm install -D playwright
npx playwright install
```

You can also start the Playwright MCP server directly with:

```bash
npx -y @playwright/mcp@latest
```

## 5) Create the environment file

Create a `.env` file in the project root with your API key:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_CODE_API_KEY=your_anthropic_api_key_here
```

A sample file is included as `.env.example`.

## 6) Run the project

If you are using TypeScript files directly:

```bash
npx tsx your-file.ts
```

Or with ts-node:

```bash
npx ts-node your-file.ts
```

## 7) Run the HTML page on localhost

From the project root, start a local web server:

### Windows PowerShell

```powershell
npx http-server -p 8080
```

Then open in your browser:

```text
http://localhost:8080/test.html
```

## 8) Useful commands

```bash
npm install
npx tsc --init
npx tsx .\hello_world.ts
claude --version
```

## Notes

- The `.env` file is already ignored by Git.
- Replace the placeholder API key with your real Anthropic key before running API calls.
