// Native/WASM parity for the actual construction, research, design and exploration loop.
import assert from 'node:assert/strict';
import {manualDesign} from './design-fixtures.mjs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import createOpenSE4 from '../web/engine/opense4.mjs';
const module=await createOpenSE4({locateFile:n=>fileURLToPath(new URL('../web/engine/'+n,import.meta.url)),print:()=>{},printErr:console.error});
const child=spawn(resolve('build-native/opense4'),[resolve('private/se4')],{stdio:['pipe','pipe','inherit']});
const lines=createInterface({input:child.stdout})[Symbol.asyncIterator]();let state;const evidence=[];
async function both(method,args={}){const w=JSON.parse(module.ccall('se4_call','string',['string','string'],[method,JSON.stringify(args)]));child.stdin.write(JSON.stringify({method,args})+'\n');const n=JSON.parse((await lines.next()).value);assert.deepEqual(w,n,method+' differs across targets');if(w.error&&!('accepted'in w))throw Error(w.error);return w;}
async function command(c){const result=await both('command',{type:'engine',command:c});assert.equal(result.accepted,true,result.error);state=await both('snapshot');return state;}
async function turn(){state=await both('endTurn');evidence.push({turn:state.turn,checksum:state.checksum,ships:state.ships.length,colonies:state.colonies.length});return state;}
try{
 state=await both('initialize',{empireFile:'terran.emp',seed:12345,systemCount:12,opponents:2});
 const home=state.colonies[0].planet;
 const research=[...state.research.available].sort((a,b)=>a.cost-b.cost)[0];
 await command({kind:'set_research',queue:[{area:research.id}],evenly:true});
 assert.equal(state.designs.length,0);assert.equal(state.ships.length,0);
 const draft=manualDesign(state,'Browser Scout');
 const preview=await both('previewDesign',draft);assert.deepEqual(preview.problems,[]);
 const lockedHull=1;assert.ok(!state.catalog.hulls.some(h=>h.id===lockedHull));
 const locked={...draft,name:'Locked hull test',hull:lockedHull};
 assert.ok((await both('previewDesign',locked)).problems.some(p=>/not yet researched/.test(p)));
 assert.equal((await both('command',{type:'engine',command:{kind:'create_design',design:locked}})).accepted,false);
 await command({kind:'create_design',design:draft});const scout=state.designs.find(d=>d.name==='Browser Scout');assert.ok(scout);
 await command({kind:'queue_add',target:{planet:home,yard:0},item:{kind:'vehicle',design:scout.id,count:1}});
 assert.equal(state.colonies[0].yards[0].queue[0].name,'Browser Scout');
 for(let i=0;i<8&&!state.ships.some(v=>v.design===scout.id);i++)await turn();
 let ship=state.ships.find(v=>v.design===scout.id);assert.ok(ship,'engine did not construct the scout');
 assert.ok(state.research.levels.find(t=>t.id===research.id).level>research.level,'research did not advance');
 if(!ship.movement){await turn();ship=state.ships.find(v=>v.id===ship.id);}
 const oldLocation=ship.location;const x=oldLocation.x>0?oldLocation.x-1:1;
 await command({kind:'set_orders',vehicle:ship.id,orders:[{kind:'move_to',location:{system:oldLocation.system,x,y:oldLocation.y}}]});
 assert.notDeepEqual(state.ships.find(v=>v.id===ship.id).location,oldLocation,'real movement did not occur');
 const beforeFacilities=state.colonies[0].facilities;const last=state.colonies[0].facilityList.length-1;const facility=state.colonies[0].facilityList[last].id;
 await command({kind:'scrap',facility_planet:home,facility_slot:last});assert.equal(state.colonies[0].facilities,beforeFacilities-1);
 await command({kind:'queue_add',target:{planet:home},item:{kind:'facility',facility,count:1}});
 for(let i=0;i<8&&state.colonies[0].facilities<beforeFacilities;i++)await turn();assert.equal(state.colonies[0].facilities,beforeFacilities);
 const colonyDraft=manualDesign(state,'Browser Colony',true);assert.deepEqual((await both('previewDesign',colonyDraft)).problems,[]);await command({kind:'create_design',design:colonyDraft});const colonyDesign=state.designs.find(d=>d.name==='Browser Colony');assert.ok(colonyDesign.stats.canColonizeRock);await command({kind:'queue_add',target:{planet:home,yard:0},item:{kind:'vehicle',design:colonyDesign.id,count:1}});
 for(let i=0;i<8&&!state.ships.some(v=>v.design===colonyDesign.id);i++)await turn();
 const colonyShip=state.ships.find(v=>v.design===colonyDesign.id);assert.ok(colonyShip);
 const planet=state.objects.find(o=>o.kind==='planet'&&o.surface==='Rock'&&!o.owned);assert.ok(planet);
 await command({kind:'set_orders',vehicle:colonyShip.id,orders:[{kind:'colonize',object:planet.id}]});
 for(let i=0;i<12&&state.colonies.length===1;i++)await turn();assert.ok(state.colonies.some(c=>c.planet===planet.id),'engine colonization did not complete');const colonizedObject=state.objects.find(o=>o.id===planet.id);assert.equal(colonizedObject.owner,0);assert.equal(colonizedObject.colonization,'colonized');assert.match(colonizedObject.ownerColor,/^#[0-9a-f]{6}$/);
 const known=state.systems.length;
 await command({kind:'set_orders',vehicle:ship.id,orders:[{kind:'explore'}]});for(let i=0;i<12&&state.systems.length===known;i++)await turn();assert.ok(state.systems.length>known,'engine exploration did not reveal a new system');
 const saved=await both('save');const checksum=state.checksum;await turn();state=await both('load',{payload:saved});assert.equal(state.checksum,checksum);
 const invalid=await both('command',{type:'engine',command:{kind:'queue_add',target:{planet:999999},item:{kind:'vehicle',design:scout.id}}});assert.equal(invalid.accepted,false);assert.equal((await both('snapshot')).checksum,checksum);
 const yardIndex=state.colonies.find(c=>c.planet===home).facilityList.findIndex(f=>f.name.startsWith('Space Yard Facility'));assert.ok(yardIndex>=0);await command({kind:'scrap',facility_planet:home,facility_slot:yardIndex});assert.equal(state.colonies.find(c=>c.planet===home).canBuildShips,false);const shipsBefore=state.ships.length;const noYard=await both('command',{type:'engine',command:{kind:'queue_add',target:{planet:home,yard:0},item:{kind:'vehicle',design:scout.id,count:1}}});assert.equal(noYard.accepted,false);await turn();assert.equal(state.ships.length,shipsBefore,'ship built without a working yard');assert.ok(!state.colonies.find(c=>c.planet===home).queue.some(q=>q.kind==='vehicle'));
 await writeFile('tests/gameplay-loop-results.json',JSON.stringify({passed:true,actions:['zero starting ships and designs','reject unresearched hull','require a working shipyard','research technology','preview and create design','construct ship','move ship','scrap and construct facility','construct colony ship','colonize planet','explore through warp','save/load','reject invalid command'],evidence},null,2));
 console.log('PASS: genuine C++ research, design, construction, movement, colonization, warp exploration and save/load; native/WASM exact parity.');
}finally{child.stdin.end();child.kill();}
