import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile,readFile} from 'node:fs/promises';
import createOpenSE4 from '../web/engine/opense4.mjs';
import {findPreset} from '../web/src/presets.js';
const module=await createOpenSE4({locateFile:name=>fileURLToPath(new URL('../web/engine/'+name,import.meta.url)),print:()=>{},printErr:console.error});
function wasm(method,args={}){const r=JSON.parse(module.ccall('se4_call','string',['string','string'],[method,JSON.stringify(args)]));return r;}
const child=spawn(resolve('build-native/opense4'),[resolve(process.argv[2]||'../original/se4')],{stdio:['pipe','pipe','inherit']});
const lines=createInterface({input:child.stdout})[Symbol.asyncIterator]();
async function native(method,args={}){child.stdin.write(JSON.stringify({method,args})+'\n');const line=await lines.next();assert.equal(line.done,false,'native process ended');return JSON.parse(line.value);}
const presets=JSON.parse(await readFile('web/assets/empire-presets.json','utf8'));
const evidence=[];
async function both(method,args={}){const w=wasm(method,args),n=await native(method,args);assert.deepEqual(w,n,`${method}: native/WASM mismatch`);if(w.error&&!('accepted'in w))throw Error(w.error);return w;}
try{
 assert.match(wasm('snapshot').error,/Initialize/);
 for(const [file,seed] of [['terran.emp',12345],['eee.emp',7],['xiati.emp',999]]){
  let s=await both('initialize',{empireFile:file,seed,systemCount:12,opponents:2});
  assert.equal(s.systemCount,12);assert.equal(s.empires.length,3);assert.ok(s.colonies.length>=1);assert.ok(s.systems.length>0);assert.equal(s.designCount,0);assert.equal(s.ships.length,0);
  const preset=presets.find(p=>p.file===file);assert.equal(s.empires[0].style.toLowerCase(),preset.raceFolder.toLowerCase());
  const initial=s.checksum;const planet=s.colonies[0].planet;
  const c=await both('command',{type:'renamePlanet',planet,name:'Browser parity '+seed});assert.equal(c.accepted,true);
  s=await both('snapshot');assert.equal(s.colonies[0].name,'Browser parity '+seed);assert.notEqual(s.checksum,initial);
  for(let i=0;i<3;i++){const old=s;s=await both('endTurn');assert.equal(s.turn,old.turn+1);assert.notEqual(s.checksum,old.checksum);evidence.push({file,seed,turn:s.turn,checksum:s.checksum,stockpile:s.empires[0].stockpile});}
  const save=await both('save');const before=s;await both('endTurn');s=await both('load',{payload:save});assert.deepEqual(s,before);
  const bad={...save,payload:save.payload.slice(0,48)+(save.payload[48]==='0'?'1':'0')+save.payload.slice(49)};assert.ok(wasm('load',{payload:bad}).error);assert.deepEqual(wasm('snapshot'),before,'failed load mutated state');
  assert.equal(wasm('command',{type:'renamePlanet',planet:999999,name:'Bad'}).accepted,false);
 }
 const races=JSON.parse(await readFile('web/assets/races.json','utf8'));
 const allPresets=[];
 for(const race of races){
  const preset=findPreset(race.name,presets);
  const s=await both('initialize',{empireFile:preset.file,seed:2026,systemCount:12,opponents:2});
  // Quick Start uses the engine's seeded racial-point allocation, rather
  // than directly importing the static .emp characteristics.
  assert.equal(s.empires[0].style.toLowerCase(),preset.raceFolder.toLowerCase());
  assert.deepEqual(await both('initialize',{race:race.name,seed:2026,systemCount:12,opponents:2}),s,'filename and named race differ');
  assert.equal(s.designCount,0);assert.equal(s.ships.length,0);assert.ok(s.colonies.length>0);allPresets.push({file:preset.file,checksum:s.checksum});
 }
 const quickStart=[];
 for(const seed of [1,2,3,4,5,12345]) {
  const s=await both('initialize',{race:'Terran',seed});
  assert.deepEqual(await both('initialize',{race:'Terran',seed}),s,'Quick Start is not repeatable');
  assert.ok(s.empires.length>=2&&s.empires.length<=20);
  const next=await both('endTurn');assert.equal(next.turn,1);
  quickStart.push({seed,empires:s.empires.length,checksum:s.checksum,turn1Checksum:next.checksum});
 }
 assert.ok(new Set(quickStart.map(s=>s.checksum)).size>1,'different seeds must vary the game');
 assert.equal((await both('capabilities')).hegemonAI,false);
 const unavailable={race:'Terran',aiMode:'hegemon'};
 const rejection=wasm('initialize',unavailable);
 assert.deepEqual(await native('initialize',unavailable),rejection);
 assert.match(rejection.error,/Hegemon requires/);
 await writeFile('tests/engine-parity-results.json',JSON.stringify({passed:true,engine:'all upstream opense4_game sources',toolchain:'Emscripten 4.0.19',allPresets,evidence,quickStart},null,2));
 console.log('PASS: all 16 Quick Game presets initialized; 3 seeds, commands, 9 turns, native/WASM exact snapshots/checksums, save/load and corrupt-save rejection.');
} finally {child.stdin.end();child.kill();}
