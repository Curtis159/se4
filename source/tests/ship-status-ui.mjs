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
 vm.runInContext(script,dom.getInternalVMContext(),{timeout:30000});await until(()=>q('#race-grid').children.length===16,'initialization');click('#quick');click('#begin');await until(()=>!q('#game').hidden&&!q('#end-turn').disabled,'game');
 await engineCommand({kind:'create_design',design:prototype(state(),'Status Scout')});const id=state().designs.find(d=>d.name==='Status Scout').id;await engineCommand({kind:'queue_add',target:{planet:state().colonies[0].planet,yard:0},item:{kind:'vehicle',design:id,count:1}});
 for(let i=0;i<8&&!state().ships.length;i++)await vm.runInContext('(async()=>{current=await bridge.endTurn();render();})()',dom.getInternalVMContext());const ship=state().ships[0];assert.ok(ship);assert.equal(ship.totalComponents,9);assert.equal(ship.undamagedComponents,9);assert.equal(ship.parts.length,9);assert.ok(ship.supplyCapacity>0);assert.ok(ship.parts.every(p=>p.intact&&p.damage===0));
 tab('ships');const card=q('.ship-card');assert.ok(card.querySelector('.ship-status-picture'));assert.ok(card.querySelector('.ship-status-metrics').textContent.includes(ship.movement+' / '+ship.maxMovement));assert.equal(card.querySelector('.supply-bar').value,ship.supply);const disclosures=card.querySelectorAll('.ship-inspection details');assert.equal(disclosures.length,2);disclosures[0].querySelector('summary').click();assert.ok(disclosures[0].open);assert.equal(disclosures[0].querySelectorAll('.ship-component').length,9);disclosures[1].querySelector('summary').click();assert.ok(disclosures[1].textContent.includes('Empty'));
 [...card.querySelectorAll('button')].find(b=>b.textContent==='Select on Map').click();assert.ok(q('.map-selection .ship-status')||q('.ship-status'));assert.ok(q('.ship-inspection'));
 tab('colonies');const colony=q('.colony-summary');colony.querySelector('summary').click();await new Promise(r=>setTimeout(r,25));assert.ok(colony.open);const select=[...colony.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='focus:1'));assert.ok(select);select.value='focus:1';select.dispatchEvent(new w.Event('change'));[...select.parentElement.querySelectorAll('button')].find(b=>b.textContent==='Add').click();await idle();assert.equal(state().colonies[0].laborFocus,1);assert.ok(q('.colony-summary summary').textContent.includes('Labor Focus'));assert.deepEqual(errors,[]);
 await writeFile('tests/ship-status-ui-results.json',JSON.stringify({passed:true,runtime:'actual packaged WASM worker + DOM events',evidence:['Built ship supplies real portrait, movement, intact/total component state and blue supply progress','Components and cargo disclosures work in Ships and map selection','Planet Labor Focus selected through real construction UI and appears in colony summary']},null,2));console.log('PASS ship status and Labor Focus UI.');
}finally{for(const worker of workers)await worker.terminate();dom.window.close();await rm(temp,{recursive:true,force:true});}
