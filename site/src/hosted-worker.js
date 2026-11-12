// Hosted distribution: smaller HTML, compressed engine chunks and ordinary cached art.
import createOpenSE4 from '../engine-hegemon/opense4.mjs?build=28-55d20faf86c0ebc9';
let pending=Promise.resolve();
const ready=(async()=>{
 const manifest=await fetch(new URL('../engine-manifest.json?build=28-55d20faf86c0ebc9',import.meta.url)).then(r=>{if(!r.ok)throw Error('Engine manifest unavailable');return r.json();});
 async function unpack(entry){const arrays=await Promise.all(entry.parts.map(async path=>{const response=await fetch(new URL('../'+path,import.meta.url));if(!response.ok)throw Error('Engine download failed: '+path);return new Uint8Array(await response.arrayBuffer());}));const size=arrays.reduce((n,a)=>n+a.length,0),packed=new Uint8Array(size);let offset=0;for(const a of arrays){packed.set(a,offset);offset+=a.length;}if(!globalThis.DecompressionStream)throw Error('Please update your browser to load this compressed web build');const bytes=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());const digest=await crypto.subtle.digest('SHA-256',bytes);if([...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')!==entry.sha256)throw Error('Engine integrity check failed; refresh the app');return bytes;}
 const [wasm,assets]=await Promise.all([unpack(manifest.wasm),unpack(manifest.data)]);
 return createOpenSE4({wasmBinary:wasm,getPreloadedPackage:()=>assets.buffer,printErr:console.warn});
})();ready.catch(()=>{});
self.onmessage=({data:{id,method,args}})=>{pending=pending.then(async()=>{try{const engine=await ready;const result=JSON.parse(await engine.ccall('se4_call','string',['string','string'],[method,JSON.stringify(args)],{async:true}));if(typeof result.error==='string'&&!('accepted'in result))throw Error(result.error);self.postMessage({id,result});}catch(error){self.postMessage({id,error:error.message,stack:error.stack});}});};
