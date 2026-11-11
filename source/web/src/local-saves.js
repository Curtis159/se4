export async function localSave(operation,save){
 if(!globalThis.indexedDB)throw Error('Browser storage is unavailable; use Save game');
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('opense4',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{return await new Promise((resolve,reject)=>{const transaction=db.transaction('saves',operation==='write'?'readwrite':'readonly'),store=transaction.objectStore('saves'),request=operation==='write'?store.put(save,'autosave'):store.get('autosave');let value;request.onsuccess=()=>value=request.result;transaction.oncomplete=()=>resolve(value);transaction.onerror=()=>reject(transaction.error);});}finally{db.close();}
}
