import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword } from "../shared/password.js";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

function askHidden(prompt) {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    muted = true;
    rl.question("", (answer) => {
      muted = false;
      process.stdout.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

const password = process.stdin.isTTY ? await askHidden("Password: ") : await readStdin();
if (password.length < 10) {
  console.error("Use at least 10 characters. Nothing was saved.");
  process.exit(1);
}

const hash = await hashPassword(password);
process.stdout.write(`${hash}\n`);
