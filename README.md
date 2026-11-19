# Project Setup Guide

This project is set up for TypeScript, Anthropic API access, and a local static HTML page.

## 1) Install Node.js and npm

Install Node.js from https://nodejs.org/ and confirm it is available:

```bash
node -v
npm -v
```

## 1a) Install a bash wrapper on Windows

This project includes a bash session helper that looks for `bash.exe` on Windows. If you are using Windows, install Git for Windows (which includes Git Bash) and make sure the Git bin folder is available in your PATH.

Install Git for Windows from:

```text
https://git-scm.com/download/win
```

After installation, verify that bash is available:

```powershell
bash --version
```

If `bash` is not recognized, add this folder to your PATH and reopen the terminal:

```text
C:\Program Files\Git\bin
```

Alternatively, you can install Git Bash and then run the project from a Git Bash terminal.

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

To start the scenario PDF MCP server:

```bash
npm run mcp:server
```

It exposes each `scenario*.pdf` in `input/files` as a resource, an extraction tool, a CSV comparison tool, and a prompt that orchestrates extraction followed by comparison.

To send a natural-language request to the server through an MCP client app:

```bash
npm run mcp:app -- "/compare_scenario_pdfs scenario-pdf:///scenario1.pdf scenario-pdf:///scenario2.pdf"
```

Or run `npm run mcp:app` without arguments to enter a request interactively. The app starts its own stdio connection to the configured MCP server and uses the Anthropic API to choose and call its tools. Set `ANTHROPIC_API_KEY` (or `CLAUDE_API_KEY`) before running it.

On prompt type /compare_scenario_pdfs prompt from the scenario-pdf server, and fill its arguments with registered PDF resource URIs, for example:

firstPdf: scenario-pdf:///scenario.pdf
secondPdf: scenario-pdf:///scenario1.pdf

## 7) Run the HTML page on localhost

From the project root, start a local web server:

### Windows PowerShell

```powershell
npx http-server -p 8080
```

Then open in your browser:

```text
http://localhost:8080/test.html
http://localhost:8080/test_viewport.html
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
- The sample GitHub Actions workflow at `.github/workflows/ci_example.yml` installs project packages, ensures Git Bash is available, type-checks the project, and verifies the local HTTP server on pushes and pull requests to `master`. Add `ANTHROPIC_API_KEY` and `CLAUDE_CODE_API_KEY` as repository secrets if workflow steps need to make API calls; the workflow also sets the directory variables from `.env.example`.
