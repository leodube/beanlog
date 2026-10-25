import { createInterface } from "node:readline";

// One shared readline for the whole script, so piped input (several lines at
// once) is handed out a line per question instead of being swallowed by the
// first prompt.
const tty = Boolean(process.stdin.isTTY);
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: tty,
});
const queue: string[] = [];
const waiting: ((line: string) => void)[] = [];
rl.on("line", (line) =>
  waiting.length ? waiting.shift()!(line) : queue.push(line),
);
let closed = false;
rl.on("close", () => {
  closed = true;
  if (waiting.length) exitClosed();
});
function exitClosed(): never {
  console.error("\nInput ended before all questions were answered.");
  process.exit(1);
}

// While a hidden question is open, swallow keystroke echo.
let muted = false;
const out = rl as unknown as {
  _writeToOutput: (s: string) => void;
  output: NodeJS.WriteStream;
};
const write = out._writeToOutput.bind(rl);
out._writeToOutput = (s) => {
  if (!muted) write(s);
};

/** Ask one question. With `hidden`, the answer isn't echoed (for passwords). */
export function ask(
  question: string,
  { hidden = false } = {},
): Promise<string> {
  if (closed && !queue.length) exitClosed();
  process.stdout.write(question);
  muted = hidden && tty;
  return new Promise((resolve) => {
    const done = (line: string) => {
      if (muted) process.stdout.write("\n");
      muted = false;
      resolve(line);
    };
    if (queue.length) done(queue.shift()!);
    else waiting.push(done);
  });
}

export function closePrompt() {
  rl.close();
}
