export const {instance}=await WebAssembly.instantiate(await(u=>globalThis.process?.versions?.node?import('node:fs/promises').then(f=>f.readFile(u)):fetch(u).then(r=>r.arrayBuffer()))(new URL("./luge.wasm",import.meta.url)),{});
const $utuFail=(name,i,what,v)=>{throw new TypeError(`${name}: argument ${i+1} must be ${what}, not ${v===null?"null":what==="an integer"&&typeof v==="number"?v:typeof v}`)};
const $utuIn=instance.exports,$utuExports={...$utuIn,"alloc_in":(a0)=>(Number.isInteger(a0)||$utuFail("alloc_in",0,"an integer",a0),$utuIn["alloc_in"](a0)),"optimize":(a0,a1)=>(Number.isInteger(a0)||$utuFail("optimize",0,"an integer",a0),Number.isInteger(a1)||$utuFail("optimize",1,"an integer",a1),$utuIn["optimize"](a0,a1))};
export const exports=$utuExports;
