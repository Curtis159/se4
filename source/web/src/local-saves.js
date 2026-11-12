export async function localSave(operation,save,key='autosave'){
 if(!globalThis.indexedDB)throw Error('Browser storage is unavailable; use Save game');
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('opense4',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{return await new Promise((resolve,reject)=>{const transaction=db.transaction('saves',operation==='read'?'readonly':'readwrite'),store=transaction.objectStore('saves'),request=operation==='write'?store.put(save,key):operation==='delete'?store.delete(key):store.get(key);let value;request.onsuccess=()=>value=request.result;transaction.oncomplete=()=>resolve(value);transaction.onerror=()=>reject(transaction.error);});}finally{db.close();}
}
