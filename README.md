# luge

A Wasm-to-Wasm optimizer that helps single-call hot loops tier up.

V8 and SpiderMonkey only swap in optimized Wasm code at function entry,
so a long loop inside a function that runs once can stay stuck in the baseline
tier. luge moves each outermost loop into its own helper function that
re-enters itself with `return_call` after 1024, 2048, 4096, … iterations,
which gives the engine a chance to switch to optimized code partway through.

Written in [Utu](https://github.com/robertmorelli/utu).

## Usage

```sh
bun bin/luge.mjs input.wasm -o output.wasm [--threshold 1024]
```

## Development

```sh
bun run build   # needs ../utu checked out next to this repo
bun run test
```
