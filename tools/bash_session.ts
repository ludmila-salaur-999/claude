import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { createInterface, type Interface } from "node:readline";
import { randomUUID } from "node:crypto";

const ALLOWED_COMMANDS = new Set([
  "ls",
  "cat",
  "echo",
  "pwd",
  "grep",
  "find",
  "wc",
  "head",
  "tail"
]);
const SHELL_OPERATORS = new Set(["&&", "||", "|", ";", "&", ">", "<", ">>"]);

function getBashPath(): string {
  if (process.platform !== "win32") {
    return "/bin/bash";
  }

  const pathEntries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const candidates = [
    ...pathEntries.map((entry) => join(entry, "bash.exe")),
    ...pathEntries
      .map((entry) => join(entry, "git.exe"))
      .filter(existsSync)
      .map((gitPath) => join(dirname(dirname(gitPath)), "bin", "bash.exe"))
  ];
  const bashPath = candidates.find(existsSync);

  if (!bashPath) {
    throw new Error("Bash was not found. Install Git for Windows or add bash.exe to PATH.");
  }

  return bashPath;
}

// A bash process that stays alive between commands so state persists.
export class BashSession {
  process!: ChildProcessWithoutNullStreams;
  private lines!: Interface;

  constructor() {
    this.start();
  }

  private start(): void {
    const bashPath = getBashPath();
    this.process = spawn(bashPath, process.platform === "win32" ? ["--login"] : [], {
      detached: true // own process group: a timeout can kill every child
    });
    this.process.stdin.write("exec 2>&1\n"); // interleave errors with output, in order
    this.lines = createInterface({ input: this.process.stdout });
  }

  validateCommand(command: string): { ok: boolean; reason?: string } {
    // Split on whitespace: enough for a tripwire check
    const tokens = command.split(/\s+/).filter((token) => token.length > 0);
    if (tokens.length === 0) {
        return { ok: false, reason: "Empty command" };
    }

    // Allow only commands from an explicit allowlist
    const executable = tokens[0];
    if (!ALLOWED_COMMANDS.has(executable)) {
        return { ok: false, reason: `Command '${executable}' is not in the allowlist` };
    }

    // Reject shell operators written as separate words
    for (const token of tokens.slice(1)) {
        const bare = token.replace(/^["']+/, ""); // a quoted token can still smuggle an expansion
        if (SHELL_OPERATORS.has(token) || bare.startsWith("$") || bare.startsWith("`")) {
        return { ok: false, reason: `Shell operator '${token}' is not allowed` };
        }
    }

    return { ok: true };
  }  

  // Run a command in the session and return its output.
  async executeCommand(command: string): Promise<string> {
    const sentinel = `__CLAUDE_BASH_DONE_${randomUUID()}__`; // unique per call
    const output: string[] = [];
    const result = new Promise<string>((resolve) => {
      const onLine = (line: string): void => {
        if (line.includes(sentinel)) {
          // this command's output is complete
          this.lines.off("line", onLine);
          resolve(output.join(""));
        } else {
          output.push(`${line}\n`);
        }
      };
      this.lines.on("line", onLine);
    }).catch((err) => {
        console.error(`Error executing command: ${err.message}`);
        throw new Error(`Error executing command: ${err.message}`);
    });
    this.process.stdin.write(`${command}\necho ${sentinel}\n`);
    return result;
  }

  restart(): void {
    this.process.kill("SIGKILL");
    this.lines.close();
    this.start();
  }

  close(): void {
    this.process.stdin.end(); // closing stdin ends the shell so the script can exit
    this.lines.close();
  }
}

// const session = new BashSession();
// console.log(await session.executeCommand("cd /tmp && pwd"));
// console.log(await session.executeCommand("pwd")); // still /tmp: the session kept its state
// session.process.stdin.end(); // closing stdin ends the shell so the script can exit