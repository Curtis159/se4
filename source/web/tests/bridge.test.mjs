import test from 'node:test'; import assert from 'node:assert/strict';
import {OpenSE4Bridge,BridgeError,MissingNativeEngineTransport,assertSnapshot} from '../src/bridge.js';
const snapshot={turn:0,empires:[],systems:[]};
test('validates state shape',()=>{assert.deepEqual(assertSnapshot(snapshot),snapshot);assert.throws(()=>assertSnapshot({turn:3}),BridgeError)});
test('command responses cannot silently succeed',async()=>{const b=new OpenSE4Bridge({call:async(method)=> method==='command'?{accepted:true}:snapshot});assert.deepEqual(await b.initialize({race:'Terran'}),snapshot);assert.deepEqual(await b.endTurn(),snapshot);assert.deepEqual(await b.command({type:'Research'}),{accepted:true});await assert.rejects(b.command({}),BridgeError)});
test('missing native engine fails explicitly',async()=>{const b=new OpenSE4Bridge(new MissingNativeEngineTransport());await assert.rejects(b.initialize({race:'Terran'}),/not yet compiled/)});

test('AI capabilities are exposed without inventing a playable Hegemon mode',async()=>{
 const calls=[];
 const bridge=new OpenSE4Bridge({call:async(method,args)=>{calls.push({method,args});return method==='capabilities'?{classicAI:true,hegemonAI:false}:method==='load'?snapshot:snapshot;}});
 assert.equal((await bridge.capabilities()).hegemonAI,false);
 const save={format:'OpenSE4-save-hex-v1',payload:'00',aiMode:'hegemon'};
 await bridge.load(save);
 assert.equal(calls.at(-1).args.aiMode,'hegemon');
});
