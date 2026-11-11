export class WasmTransport {
 constructor(){
  this.worker=new Worker(new URL('./wasm-worker.js',import.meta.url),{type:'module'});
  this.nextId=0;this.pending=new Map();this.failed=null;
  this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);if(data.error){const error=new Error(data.error);if(data.stack)error.stack=data.stack;p.reject(error);}else p.resolve(data.result);};
  this.worker.onerror=event=>{const detail=[event.message,event.filename,event.lineno?`line ${event.lineno}`:''].filter(Boolean).join(' · ');this.failed=new Error(detail||'The browser could not start the engine worker. Open this HTML in Microsoft Edge or Chrome.');for(const p of this.pending.values())p.reject(this.failed);this.pending.clear();};
 }
 call(method,args={}){if(this.failed)return Promise.reject(this.failed);return new Promise((resolve,reject)=>{const id=++this.nextId;this.pending.set(id,{resolve,reject});this.worker.postMessage({id,method,args});});}
}
