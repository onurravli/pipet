#!/usr/bin/env node

import { parseArgs } from "util";
import { spawn } from "child_process";

interface PipetOptions {
  onSuccess: string;
  onError: string;
  command: string[];
  hide: boolean;
}

export function parseOptions(args: string[]): PipetOptions {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "on-success": { type: "string" },
      "on-error": { type: "string" },
      hide: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  // Find the index of '--' separator
  const separatorIndex = args.indexOf("--");
  if (separatorIndex === -1) {
    throw new Error('Missing command separator "--"');
  }

  // Everything after '--' is the command to execute
  const command = args.slice(separatorIndex + 1);
  if (command.length === 0) {
    throw new Error("No command specified");
  }

  const onSuccess = values["on-success"] as string | undefined;
  const onError = values["on-error"] as string | undefined;
  const hide = values["hide"] as boolean;

  if (!onSuccess) {
    throw new Error("--on-success is required");
  }

  if (!onError) {
    throw new Error("--on-error is required");
  }

  return {
    onSuccess,
    onError,
    command,
    hide,
  };
}

export async function runCommand({
  command,
  onSuccess,
  onError,
  hide,
}: PipetOptions): Promise<void> {
  const [cmd, ...args] = command;

  const childProcess = spawn(cmd, args, {
    stdio: ["inherit", hide ? "pipe" : "inherit", hide ? "pipe" : "inherit"],
    shell: true,
  });

  let output = "";
  childProcess.stdout?.on("data", (data) => {
    output += data;
    if (!hide) {
      process.stdout.write(data);
    }
  });

  childProcess.stderr?.on("data", (data) => {
    if (!hide) {
      process.stderr.write(data);
    }
  });

  return new Promise((resolve, reject) => {
    childProcess.on("close", (code) => {
      if (code === 0) {
        console.log(onSuccess);
        resolve();
      } else {
        console.error(onError);
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    childProcess.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    const options = parseOptions(process.argv.slice(2));
    await runCommand(options);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
