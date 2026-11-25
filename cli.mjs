#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { exports as luge } from "./dist/luge.mjs";

const args = process.argv.slice(2);
let input = null;
let output = null;
let threshold = 1024;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-o" || args[i] === "--out") {
    output = args[++i];
  } else if (args[i] === "-t" || args[i] === "--threshold") {
    threshold = Number(args[++i]);
  } else if (args[i] === "-h" || args[i] === "--help") {
    console.log("usage: luge <input.wasm> [-o <output.wasm>] [--threshold 1024]");
    process.exit(0);
  } else if (!input) {
    input = args[i];
  }
}

if (!input) {
  console.error("usage: luge <input.wasm> [-o <output.wasm>] [--threshold 1024]");
  process.exit(2);
}

if (!output) {
  const parsed = path.parse(input);
  output = path.join(parsed.dir, `${parsed.name}.luge${parsed.ext || ".wasm"}`);
}

const bytes = fs.readFileSync(input);
const t0 = performance.now();
luge.alloc_in(bytes.length);
new Uint8Array(luge.inp.buffer, 0, bytes.length).set(bytes);
const outLen = luge.optimize(bytes.length, threshold);
if (outLen < 0) {
  console.error(`luge: invalid WebAssembly binary: ${input}`);
  process.exit(1);
}
const outBytes = new Uint8Array(luge.out.buffer, 0, outLen).slice();
const dt = performance.now() - t0;

if (!WebAssembly.validate(outBytes)) {
  console.error("luge: internal error — emitted Wasm failed validation");
  process.exit(1);
}

fs.writeFileSync(output, outBytes);
console.log(
  `luge: outlined ${luge.outlined_count()} loop(s) in ${dt.toFixed(1)} ms (${bytes.length} -> ${outBytes.length} bytes) -> ${output}`
);
