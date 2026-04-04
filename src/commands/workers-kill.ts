#!/usr/bin/env bun
/**
 * workers-kill - Kill stale droid worker processes
 * 
 * Usage:
 *   bun run workers-kill     - List and prompt to kill all droid processes
 *   bun run workers-kill --all - Kill all droid processes without prompting
 */

import { execSync } from "child_process";
import pc from "picocolors";

async function main() {
  const args = Bun.argv.slice(2);
  const killAll = args.includes("--all");

  console.log(pc.cyan("\n━━━ Droid Worker Processes ━━━\n"));

  // Find droid processes
  let processes: any[] = [];
  try {
    const output = execSync(
      `tasklist /FI "IMAGENAME eq node.exe" /FO CSV /V`,
      { encoding: "utf8", shell: true }
    );

    const lines = output.trim().split("\n");
    const headers = lines[0].split(",").map((h: string) => h.replace(/"/g, ""));
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v: string) => v.replace(/"/g, "").trim());
      if (values.length >= 2) {
        const pid = values[1];
        const title = values[headers.indexOf("Window Title") || values.length - 1] || "";
        if (title.includes("droid") || values[0].includes("droid")) {
          processes.push({ pid, title, cmd: values[0] });
        }
      }
    }
  } catch {
    // Try alternative method
    try {
      const output = execSync(
        `wmic process where "name='node.exe'" get processid,commandline /format:csv`,
        { encoding: "utf8", shell: true }
      );
      const lines = output.trim().split("\n");
      for (const line of lines.slice(1)) {
        if (line.includes("droid")) {
          const parts = line.split(",");
          if (parts.length >= 2) {
            processes.push({ 
              pid: parts[0].trim(), 
              cmd: parts.slice(1).join(",").slice(0, 100),
              title: "" 
            });
          }
        }
      }
    } catch {
      // No processes found
    }
  }

  if (processes.length === 0) {
    console.log(pc.green("No droid processes found.\n"));
    return;
  }

  console.log(pc.bold("PID"), pc.dim(" | Command"));
  console.log(pc.dim("----" + " ".repeat(10) + " | " + "-".repeat(60)));
  for (const p of processes) {
    console.log(
      pc.yellow(p.pid.padStart(5)) + 
      pc.dim(" | ") + 
      pc.dim((p.title || p.cmd || "unknown").slice(0, 60))
    );
  }
  console.log();

  if (!killAll) {
    console.log(pc.yellow("Run with --all to kill without prompting:"));
    console.log(pc.dim("  bun run workers-kill --all\n"));
    return;
  }

  // Kill all
  console.log(pc.dim("Killing all droid processes...\n"));
  for (const p of processes) {
    try {
      execSync(`taskkill /PID ${p.pid} /F`, { encoding: "utf8" });
      console.log(pc.green(`✓ Killed ${p.pid}`));
    } catch {
      console.log(pc.red(`✗ Failed to kill ${p.pid}`));
    }
  }
  console.log(pc.green("\n✓ All droid processes terminated.\n"));
}

main();
