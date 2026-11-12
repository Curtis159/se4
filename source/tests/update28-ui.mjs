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
const dom=new JSDOM(html.slice(0,start)+'</script></body></html>',{runScripts:'outside-only',url:'https://local-test.invalid/',pretendToBeVisual:true,virtualConsole});
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
const click=s=>{assert.ok(q(s),s+' missing');assert.notEqual(q(s).disabled,true,s+' disabled');q(s).click();};
async function until(predicate,label){const deadline=Date.now()+90000;while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,15));}throw Error(label+' timed out; status: '+q('#status').textContent);}
async function idle(){await until(()=>!q('#end-turn').disabled&&!q('#status').textContent.includes('Processing'),'processing');}
function tab(name){click(`[data-tab="${name}"]`);}
async function advanceTurn(){for(let i=0;i<100&&q('#end-turn').classList.contains('turn-next');i++)click('#skip-turn-task');assert.ok(q('#end-turn').classList.contains('turn-ready'));click('#end-turn');await idle();}


const evidence=[];const state=()=>JSON.parse(vm.runInContext('JSON.stringify(current)',dom.getInternalVMContext()));
async function engineCommand(command){await vm.runInContext('(async()=>{const r=await bridge.command('+JSON.stringify({type:'engine',command})+');if(!r.accepted)throw Error(r.error);current=await bridge.snapshot();designerOpen=false;tab="designs";render();})()',dom.getInternalVMContext());}
function choose(id,label){const card=q('[data-design="'+id+'"]');assert.ok(card,'design card');card.querySelector('.design-actions').open=true;const button=[...card.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(button,label);assert.equal(button.disabled,false,label);button.click();}
function prototype(snapshot,name){const hull=snapshot.catalog.hulls.find(h=>h.name==='Escort');const entries=[];for(const [name,n]of [['Bridge',1],['Life Support',1],['Crew Quarters',1],['Ion Engine I',6]]){const part=snapshot.catalog.components.find(c=>c.name===name);for(let i=0;i<n;i++)entries.push({component:part.id,mount:-1});}return {name,hull:hull.id,entries,design_type:'Attack Ship'};}

const registration={waiting:null,installing:null,addEventListener(){},update:async()=>{}};
Object.defineProperty(w.navigator,'serviceWorker',{value:{controller:{},register:async(url,options)=>{assert.equal(url,'./sw.js');assert.equal(options.updateViaCache,'none');return registration;},addEventListener(){},removeEventListener(){}}});
try{
 vm.runInContext(script,dom.getInternalVMContext(),{timeout:30000});await until(()=>q('#race-grid').children.length===16,'startup');
 if(process.argv[2]){const save=JSON.parse(await readFile(process.argv[2],'utf8'));await vm.runInContext('restoreSession('+JSON.stringify(save)+')',dom.getInternalVMContext());}else{click('#quick');q('#seed').value='12345';click('#begin');await idle();}
 const checksum=state().checksum;assert.equal(q('#app-build').textContent,'Build 28');tab('status');const simulator=[...doc.querySelectorAll('.status-subnav button')].find(b=>b.textContent==='Combat Simulator');assert.ok(simulator,'Simulator tab must exist for this save');simulator.click();await until(()=>doc.querySelectorAll('.simulator-side').length===2,'simulator loaded');assert.equal(state().checksum,checksum);
 click('#check-updates');await until(()=>q('#update-heading').textContent==='Your app is up to date','up to date feedback');assert.equal(q('#app-update').hidden,false);assert.ok(q('#update-message').textContent.includes('Current app build 28'));assert.equal(q('#apply-update').hidden,true);click('#defer-update');assert.equal(q('#app-update').hidden,true);
 registration.update=async()=>{throw Error('Test offline')};click('#check-updates');await until(()=>q('#update-heading').textContent==='Update check failed','failure feedback');assert.ok(q('#update-message').textContent.includes('Test offline'));
 registration.update=async()=>{};registration.installing={};click('#check-updates');await until(()=>q('#update-heading').textContent==='Downloading update…','download feedback');assert.equal(q('#apply-update').hidden,true);
 registration.installing=null;registration.waiting={postMessage(){}};click('#check-updates');await until(()=>q('#update-heading').textContent==='Update available','ready feedback');assert.equal(q('#apply-update').hidden,false);assert.equal(state().checksum,checksum);await vm.runInContext('sessionStorage.setItem("se4-update-complete","1");showUpdateCompletion()',dom.getInternalVMContext());assert.equal(q('#update-heading').textContent,'Update complete');assert.equal(w.sessionStorage.getItem('se4-update-complete'),null);
 assert.deepEqual(errors,[]);await writeFile('tests/update28-ui-results.json',JSON.stringify({passed:true,providedSave:!!process.argv[2],evidence:['Supplied save loads in the real WASM worker; simulator tab and force selectors render','Loaded code shows Build 28 in the menu','Manual update check displays persistent up-to-date, failure, downloading and update-ready results','Only a ready update offers Save & update','UI checks leave campaign checksum unchanged']},null,2));console.log('PASS supplied-save simulator tab and explicit update feedback with real WASM campaign.');
}finally{for(const worker of workers)await worker.terminate();dom.window.close();await rm(temp,{recursive:true,force:true});}
