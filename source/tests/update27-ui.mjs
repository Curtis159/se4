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
try{
 vm.runInContext(script,dom.getInternalVMContext(),{timeout:30000});await until(()=>q('#race-grid').children.length===16,'initialization');click('#quick');q('#seed').value='12345';click('#begin');await until(()=>!q('#game').hidden&&!q('#end-turn').disabled,'game');await engineCommand({kind:'create_design',design:prototype(state(),'Legacy engines')});const propulsion=state().research.available.find(a=>a.name==='Propulsion');await engineCommand({kind:'set_research',queue:[{area:propulsion.id}],evenly:false,repeat:false});await vm.runInContext('(async()=>{current=await bridge.endTurn();render();})()',dom.getInternalVMContext());assert.ok(state().catalog.components.some(c=>c.name==='Ion Engine II'));const design=state().designs.find(d=>d.name==='Legacy engines');choose(design.id,'Edit');await idle();[...doc.querySelectorAll('button')].find(b=>b.textContent==='Previous: Equipment').click();await until(()=>q('#component-category'),'equipment');q('#component-category').value='Engines';q('#component-category').dispatchEvent(new w.Event('change'));const latest=()=>q('input[aria-label="Latest researched only"]');assert.equal(latest().checked,true);let choices=[...doc.querySelectorAll('.component-title')].map(e=>e.textContent);assert.ok(choices.includes('Ion Engine II'));assert.ok(!choices.includes('Ion Engine I'));assert.ok(q('.fitted-list').textContent.includes('Ion Engine I'));latest().click();choices=[...doc.querySelectorAll('.component-title')].map(e=>e.textContent);assert.ok(choices.includes('Ion Engine I')&&choices.includes('Ion Engine II'));assert.equal(w.localStorage.getItem('se4-latest-components'),'false');latest().click();assert.equal(latest().checked,true);
 const before=state().checksum;await vm.runInContext('var updateTestStore=new Map();localSave=async(operation,save,key="autosave")=>{if(operation==="write"){updateTestStore.set(key,JSON.parse(JSON.stringify(save)));return key;}if(operation==="delete")return updateTestStore.delete(key);return updateTestStore.get(key);};saveBeforeUpdate();',dom.getInternalVMContext());assert.ok(w.sessionStorage.getItem('se4-update-save'));await vm.runInContext('(async()=>{current=await bridge.endTurn();render();})()',dom.getInternalVMContext());assert.notEqual(state().checksum,before);await vm.runInContext('restoreUpdateCheckpoint()',dom.getInternalVMContext());assert.equal(state().checksum,before);assert.equal(w.sessionStorage.getItem('se4-update-save'),null);assert.equal(vm.runInContext('updateTestStore.size',dom.getInternalVMContext()),0);
 await vm.runInContext('localSave=async()=>{throw Error("Storage full")}',dom.getInternalVMContext());await assert.rejects(()=>vm.runInContext('saveBeforeUpdate()',dom.getInternalVMContext()),/Storage full/);assert.equal(w.sessionStorage.getItem('se4-update-save'),null);assert.equal(q('#app-update').hidden,true);assert.deepEqual(errors,[]);await writeFile('tests/update27-ui-results.json',JSON.stringify({passed:true,evidence:['Latest researched is checked by default; Engines offers II while legacy I remains fitted','Unchecking shows both engine versions and remembers the preference','Update checkpoint saves and restores the actual WASM campaign checksum, then removes its temporary backup','Storage failure refuses checkpoint creation rather than proceeding with restart']},null,2));console.log('PASS latest-parts filter and real WASM update checkpoint restore.');
}finally{for(const worker of workers)await worker.terminate();dom.window.close();await rm(temp,{recursive:true,force:true});}
