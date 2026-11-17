import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { compare } from '../lib/compare.js';
import { extract } from '../lib/extract.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, '..');
const inputDirectory = path.resolve(
  projectDirectory,
  process.env.INPUT_DIR_FILES ?? 'input/files'
);
const outputDirectory = path.resolve(
  projectDirectory,
  process.env.OUTPUT_DIR_FILES ?? 'output/files'
);

interface ScenarioPdf {
  fileName: string;
  filePath: string;
  resourceUri: string;
  csvName: string;
}

function isScenarioPdf(fileName: string): boolean {
  return /^scenario\d*\.pdf$/i.test(fileName);
}

function toolText(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export async function createMcpServer(): Promise<McpServer> {
  const files = (await readdir(inputDirectory))
    .filter(isScenarioPdf)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const scenarios = files.map((fileName): ScenarioPdf => ({
    fileName,
    filePath: path.join(inputDirectory, fileName),
    resourceUri: `scenario-pdf:///${encodeURIComponent(fileName)}`,
    csvName: fileName.replace(/\.pdf$/i, '.csv'),
  }));
  const scenariosByUri = new Map(scenarios.map((scenario) => [scenario.resourceUri, scenario]));

  if (scenarios.length === 0) {
    throw new Error(`No scenario PDF files found in ${inputDirectory}`);
  }

  const server = new McpServer(
    { name: 'scenario-pdf-tools', version: '1.0.0' },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
      instructions:
        'Use scenario PDF resource references to extract tables as CSV before comparing documents.',
    }
  );

  for (const scenario of scenarios) {
    server.registerResource(
      scenario.fileName,
      scenario.resourceUri,
      {
        description: `PDF input document ${scenario.fileName}`,
        mimeType: 'application/pdf',
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/pdf',
            blob: (await readFile(scenario.filePath)).toString('base64'),
          },
        ],
      })
    );
  }

  server.registerTool(
    'extract_pdf_to_csv',
    {
      title: 'Extract PDF tables to CSV',
      description:
        'Extract tables from a scenario PDF resource and save its CSV as the matching scenario name in the output files directory.',
      inputSchema: {
        resourceUri: z.string().describe('URI of a registered scenario PDF resource'),
      },
    },
    async ({ resourceUri }) => {
      const scenario = scenariosByUri.get(resourceUri);
      if (!scenario) {
        throw new Error(`Unknown scenario PDF resource: ${resourceUri}`);
      }

      const prompt =
        `Extract all tables from the supplied PDF into a CSV file named "${scenario.csvName}". ` +
        'Preserve all table data and column headings. Use wide format, with one row per record, ' +
        'and split grouped column headings into their component columns when applicable. ' +
        `Save the CSV in the configured output files directory as "${scenario.csvName}". ` +
        'Return a concise extraction status.';
      const answer = await extract(prompt, scenario.fileName);
      const responseText = answer.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      await access(path.join(outputDirectory, scenario.csvName));
      return toolText(
        responseText || `Extracted ${scenario.fileName} to ${scenario.csvName}.`
      );
    }
  );

  server.registerTool(
    'compare_csvs',
    {
      title: 'Compare extracted CSV files',
      description:
        'Compare two scenario CSV files already present in the output files directory and report whether they match or list identified issues.',
      inputSchema: {
        baseCsv: z.string().describe('Scenario CSV filename used as the expected/base data'),
        scenarioCsv: z.string().describe('Scenario CSV filename used as the actual data'),
      },
    },
    async ({ baseCsv, scenarioCsv }) => {
      const validCsvNames = new Set(scenarios.map((scenario) => scenario.csvName));
      if (!validCsvNames.has(baseCsv) || !validCsvNames.has(scenarioCsv)) {
        throw new Error('Both CSV filenames must correspond to registered scenario PDF resources.');
      }

      await Promise.all([
        access(path.join(outputDirectory, baseCsv)),
        access(path.join(outputDirectory, scenarioCsv)),
      ]);

      return toolText(await compare(baseCsv, scenarioCsv));
    }
  );

  server.registerPrompt(
    'compare_scenario_pdfs',
    {
      title: 'Test two scenario PDFs',
      description:
        'Extract two scenario PDFs to CSV, then compare the resulting CSV files for equality and data issues.',
      argsSchema: {
        firstPdf: z.string().describe('Resource URI for the expected/base PDF'),
        secondPdf: z.string().describe('Resource URI for the PDF to test'),
      },
    },
    ({ firstPdf, secondPdf }): GetPromptResult => {
      const firstScenario = scenariosByUri.get(firstPdf);
      const secondScenario = scenariosByUri.get(secondPdf);
      if (!firstScenario || !secondScenario) {
        throw new Error('Prompt arguments must be registered scenario PDF resource URIs.');
      }

      return {
        description: 'Extract both PDFs to CSV before comparing their data.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                `Test whether the PDF resources ${firstPdf} and ${secondPdf} are identical or contain data issues.`,
                `First call the extract_pdf_to_csv tool for ${firstPdf}; its CSV filename is ${firstScenario.csvName}.`,
                `Then call the extract_pdf_to_csv tool for ${secondPdf}; its CSV filename is ${secondScenario.csvName}.`,
                'Do not compare the PDFs directly. Wait until both extractions have completed successfully, then call compare_csvs with the two CSV filenames above.',
                'Report "Test passed." only if the CSVs are identical; otherwise report only the issues identified by the comparison tool.',
              ].join('\n'),
            },
          },
        ],
      };
    }
  );

  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const server = await createMcpServer();
    await server.connect(new StdioServerTransport());
  } catch (error) {
    console.error('Failed to start scenario PDF MCP server:', error);
    process.exitCode = 1;
  }
}