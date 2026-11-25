# luge

Standalone Wasm-to-Wasm binary optimizer (written in Utu, compiled with `--luge`, wrapped as a Bun CLI) that outlines outermost loops into helper functions with an exponential-backoff `return_call` (`1024, 2048, 4096, ...`) so V8 (Liftoff → TurboFan) and SpiderMonkey (Baseline → Ion) can tier up single-call hot loops mid-run.

```sh
bun cli.mjs input.wasm -o output.wasm
bun test.mjs
```
