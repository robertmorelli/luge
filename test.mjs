import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Hand-assembled valid Wasm module:
// (module
//   (func (export "work") (param $n i32) (result i32)
//     (local $i i32) (local $acc i32) (local $x i32)
//     (local.set $x (i32.const 1))
//     (block $exit
//       (loop $lp
//         (br_if $exit (i32.ge_s (local.get $i) (local.get $n)))
//         (local.set $x (i32.xor (i32.mul (local.get $x) (i32.const 1664525)) (i32.const 1013904223)))
//         (local.set $acc (i32.add (local.get $acc) (i32.and (local.get $x) (i32.const 255))))
//         (local.set $i (i32.add (local.get $i) (i32.const 1)))
//         (br $lp)))
//     (local.get $acc)))
function lebU(n) {
  const a = [];
  do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; a.push(b); } while (n);
  return a;
}
function lebS(n) {
  const a = [];
  while (true) {
    let b = n & 0x7f; n >>= 7;
    if ((n === 0 && (b & 0x40) === 0) || (n === -1 && (b & 0x40) !== 0)) { a.push(b); break; }
    a.push(b | 0x80);
  }
  return a;
}
function sec(id, body) { return [id, ...lebU(body.length), ...body]; }

const body = [
  1, 3, 0x7f, // 3 i32 locals: $i=1, $acc=2, $x=3
  0x41, ...lebS(1), 0x21, 3, // x = 1
  0x02, 0x40, // block
    0x03, 0x40, // loop
      0x20, 1, 0x20, 0, 0x4e, 0x0d, 1, // br_if 1 (i >= n)
      0x20, 3, 0x41, ...lebS(1664525), 0x6c, 0x41, ...lebS(1013904223), 0x73, 0x21, 3,
      0x20, 2, 0x20, 3, 0x41, ...lebS(255), 0x71, 0x6a, 0x21, 2,
      0x20, 1, 0x41, ...lebS(1), 0x6a, 0x21, 1,
      0x0c, 0, // br 0
    0x0b,
  0x0b,
  0x20, 2, // return acc
  0x0b,
];

const wasm = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  ...sec(1, [1, 0x60, 1, 0x7f, 1, 0x7f]),
  ...sec(3, [1, 0]),
  ...sec(7, [1, 4, 0x77, 0x6f, 0x72, 0x6b, 0x00, 0]),
  ...sec(10, [1, ...lebU(body.length), ...body]),
]);

if (!WebAssembly.validate(wasm)) throw new Error("test fixture invalid");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "luge-test-"));
const inPath = path.join(tmp, "work.wasm");
const outPath = path.join(tmp, "work.luge.wasm");
fs.writeFileSync(inPath, wasm);

const cli = spawnSync("bun", ["cli.mjs", inPath, "-o", outPath], { encoding: "utf8" });
process.stdout.write(cli.stdout);
if (cli.status !== 0) {
  process.stderr.write(cli.stderr);
  process.exit(1);
}

// Verify exact result + measure cold-start V8 (Node) speedup
const N = 200_000_000;
function benchV8(file) {
  const script = `
    const fs = require("fs");
    const m = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(${JSON.stringify(file)})));
    const t0 = performance.now();
    const r = m.exports.work(${N});
    const dt = performance.now() - t0;
    console.log(JSON.stringify({ r, dt }));
  `;
  const p = spawnSync("node", ["-e", script], { encoding: "utf8" });
  if (p.status !== 0) throw new Error(p.stderr);
  return JSON.parse(p.stdout.trim());
}

const orig = benchV8(inPath);
const opt = benchV8(outPath);
if (orig.r !== opt.r) throw new Error(`result mismatch: ${orig.r} vs ${opt.r}`);
console.log(`V8 cold-start (N=${N}): orig=${orig.dt.toFixed(1)} ms, luge=${opt.dt.toFixed(1)} ms (${(orig.dt / opt.dt).toFixed(2)}x speedup, res=${opt.r})`);
