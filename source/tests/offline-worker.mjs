// Executes the packaged worker with Node worker_threads. This is NOT a browser UI test.
import {Worker} from 'node:worker_threads';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
const html=await readFile(process.env.SE4_UI_HTML||'OpenSE4_Headless_WASM.html','utf8');
const literal=name=>{const start=html.indexOf('const '+name+'=')+('const '+name+'=').length;const end=html.indexOf(';\n',start);return JSON.parse(html.slice(start,end));};
// Exercise Emscripten's browser-worker branch and the opaque Blob module URL.
// Node's own file URL would hide relative-URL failures in the offline bundle.
const source=literal('workerSource');
new vm.Script(source); // A classic worker must parse without ES-module syntax.
const prefix="import {parentPort} from 'node:worker_threads';globalThis.process=undefined;globalThis.WorkerGlobalScope=class {};globalThis.self={location:{href:'blob:https://offline-test.invalid/engine-worker'},postMessage:value=>parentPort.postMessage(value)};parentPort.on('message',data=>self.onmessage({data}));\n";
const temp=await mkdtemp(join(tmpdir(),'se4-worker-'));const filename=join(temp,'worker.mjs');await writeFile(filename,prefix+source);
const worker=new Worker(pathToFileURL(filename),{resourceLimits:{stackSizeMb:Number(process.env.SE4_WORKER_STACK_MB)||4}});
let id=0;
function call(method,args={}){return new Promise((resolve,reject)=>{const seq=++id;const onmessage=data=>{if(data.id!==seq)return;worker.off('message',onmessage);data.error?reject(Error(data.error)):resolve(data.result);};worker.on('message',onmessage);worker.once('error',reject);worker.postMessage({id:seq,method,args});});}
try{
 worker.postMessage({boot:true,wasm:literal('wasmBase64'),assets:literal('assetsBase64')});
 const initial=await call('initialize',{empireFile:'terran.emp',seed:12345,systemCount:12,opponents:2});
 assert.equal(initial.turn,0);assert.equal(initial.systemCount,12);
 const next=await call('endTurn');assert.equal(next.turn,1);assert.notEqual(next.checksum,initial.checksum);
 let hegemon=null;if((await call('capabilities')).hegemonAI){await call('initialize',{race:'Terran',seed:12345,systemCount:12,opponents:2,aiMode:'hegemon'});const [advanced,view,diagnostics]=await Promise.all([call('endTurn'),call('snapshot'),call('aiDiagnostics')]);assert.equal(view.checksum,advanced.checksum,'async engine requests must serialize');assert.ok(diagnostics.requests>=8);assert.equal(diagnostics.fallbacks,0);assert.deepEqual(diagnostics.errors,[]);hegemon={checksum:advanced.checksum,diagnostics};console.log('PASS packaged Hegemon worker: actual decisions, zero fallbacks, serialized concurrent requests.');}
 await writeFile('tests/offline-worker-results.json',JSON.stringify({passed:true,hegemon,runtime:'Node worker_threads, browser-worker branch with opaque Blob URL (not real browser)',initialChecksum:initial.checksum,turn1Checksum:next.checksum},null,2));
 console.log('PASS: standalone HTML contains a working compiled engine + original data, worker initialization and turn processing.');
}finally{await worker.terminate();await rm(temp,{recursive:true});}
