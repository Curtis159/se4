// DOM/event integration with the REAL packaged WASM worker. This is not visual browser QA.
import {JSDOM,VirtualConsole} from 'jsdom';
import {Worker as NodeWorker} from 'node:worker_threads';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile(process.env.SE4_UI_HTML||'OpenSE4_Headless_WASM.html','utf8');
const start=html.indexOf('<script type="module">')+'<script type="module">'.length;
const script=html.slice(start,html.lastIndexOf('</script>'));
assert.ok(!script.includes('\u00c2\u00b7'),'UTF-8 text was decoded using a Windows legacy encoding');
const temp=await mkdtemp(join(tmpdir(),'se4-dom-'));let workers=[];const errors=[],downloads=[];
const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html.slice(0,start)+'</script></body></html>',{runScripts:'outside-only',url:'https://local-test.invalid/?game=11111111-1111-4111-8111-111111111111',pretendToBeVisual:true,virtualConsole});
const w=dom.window;let seq=0;const urls=new Map();
class MemoryBlob{constructor(parts,opts){this.parts=parts;this.type=opts?.type;}async text(){return this.parts.join('');}}
w.Blob=MemoryBlob;w.URL.createObjectURL=blob=>{const id='blob:test-'+(++seq);urls.set(id,blob);return id;};w.URL.revokeObjectURL=id=>urls.delete(id);
w.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push(urls.get(this.href));};
class RealWasmWorker{
 constructor(url,options){assert.notEqual(options?.type,'module','standalone requires a classic worker');const blob=urls.get(url);const filename=join(temp,'worker-'+seq+'.mjs');const workerCode=blob.parts.join('');new vm.Script(workerCode);const source="import {parentPort} from 'node:worker_threads';globalThis.process=undefined;globalThis.WorkerGlobalScope=class {};globalThis.self={location:{href:'blob:https://offline-test.invalid/engine-worker'},postMessage:value=>parentPort.postMessage(value)};parentPort.on('message',data=>self.onmessage({data}));\n"+workerCode;
 this.ready=writeFile(filename,source).then(()=>{const worker=new NodeWorker(pathToFileURL(filename));this.worker=worker;workers.push(worker);worker.on('message',data=>this.onmessage?.({data}));worker.on('error',error=>{errors.push(error.message);this.onerror?.({message:error.message});});return worker;});}
 postMessage(data){this.ready.then(worker=>worker.postMessage(data));}
}
w.Worker=RealWasmWorker;
const doc=w.document;
const q=s=>doc.querySelector(s);
const click=s=>{assert.ok(q(s),s+' missing');assert.equal(q(s).disabled,false,s+' disabled');q(s).click();};
async function until(predicate,label){const deadline=Date.now()+90000;while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,15));}throw Error(label+' timed out; status: '+q('#status').textContent);}
async function idle(){await until(()=>!q('#end-turn').disabled&&!q('#status').textContent.includes('Processing'),'processing');}
function tab(name){click(`[data-tab="${name}"]`);}
async function advanceTurn(){for(let i=0;i<100&&q('#end-turn').classList.contains('turn-next');i++)click('#skip-turn-task');assert.ok(q('#end-turn').classList.contains('turn-ready'));click('#end-turn');await idle();}


const fixture=JSON.parse(await readFile('tests/fixtures/v15-classic.json','utf8'));fixture.save.browserSession={playMode:'async',autosaveEvery:0};const requests=[];
w.localStorage.setItem('se4-online',JSON.stringify({access_token:'test-session',refresh_token:'test-refresh',expires_at:9999999999,user:{id:'22222222-2222-4222-8222-222222222222',email:'player@example.invalid'}}));
w.fetch=async(url,options={})=>{requests.push({url,options});let value;if(url==='./online-config.json')value={supabaseUrl:'https://service.example.invalid',publishableKey:'public'};else if(url.endsWith('/rpc/se4_take_turn'))value={revision:4,save:fixture.save};else if(url.endsWith('/rpc/se4_handoff'))value=5;else if(url.includes('/rest/v1/se4_games?')||url.endsWith('/rpc/se4_list_games'))value=[];else throw Error('Unexpected request '+url);return {ok:true,text:async()=>JSON.stringify(value),json:async()=>value};};
try{
 vm.runInContext(script,dom.getInternalVMContext(),{timeout:30000});await until(()=>!q('#game').hidden&&!q('#end-turn').disabled,'notification auto retrieval');assert.ok(q('#game-title').textContent.includes('2400.1'));assert.equal(downloads.length,0);assert.equal(requests.filter(r=>r.url.endsWith('/rpc/se4_take_turn')).length,1);
 for(let i=0;i<100&&q('#end-turn').classList.contains('turn-next');i++)click('#skip-turn-task');click('#end-turn');await until(()=>!q('#online').hidden,'online handoff');const upload=requests.find(r=>r.url.endsWith('/rpc/se4_handoff'));assert.ok(upload);assert.equal(upload.options.headers.Authorization,'Bearer test-session');const packet=JSON.parse(upload.options.body);assert.equal(packet.expected_revision,4);assert.equal(packet.next_turn,2);assert.equal(packet.next_save.format,'OpenSE4-save-hex-v1');assert.equal(downloads.length,0,'online turns must not download files');assert.equal(vm.runInContext('current',dom.getInternalVMContext()),null,'submitted turn must not expose the next player locally');assert.deepEqual(errors,[]);
 await writeFile('tests/online-ui-results.json',JSON.stringify({passed:true,runtime:'mock Supabase REST + actual packaged WASM; no live deployment or push sent',evidence:['notification deep link automatically retrieves and loads authenticated save','ending turn automatically uploads save with revision guard','no manual file download or file selection']},null,2));console.log('PASS online automatic retrieval and turn upload inside the app, using mock REST and genuine WASM.');
}finally{for(const worker of workers)await worker.terminate();dom.window.close();await rm(temp,{recursive:true,force:true});}
