// Keep play available while the browser installs an update in the background.
export function watchAppUpdates(serviceWorker,{onReady=()=>{},onRestart=()=>{},onStatus=()=>{}}={}){
 let registration,applying=false,finish,reject,timeout,downloadTimer,state='idle';
 const report=(next,message='')=>{state=next;onStatus({state:next,message});};
 const offer=()=>{if(registration?.waiting&&serviceWorker.controller&&!applying){clearTimeout(downloadTimer);report('available');onReady();return true;}return false;};
 const observe=()=>{const worker=registration.installing;if(!worker)return;
  if(serviceWorker.controller){report('downloading');clearTimeout(downloadTimer);downloadTimer=setTimeout(()=>report('downloading','The update is still downloading. Keep the game open online.'),180000);}
  worker.addEventListener('statechange',()=>{if(worker.state==='installed'){clearTimeout(downloadTimer);if(!offer())report('current');}else if(worker.state==='redundant'){clearTimeout(downloadTimer);report('error','The update download failed. Check your connection and try again.');}});
 };
 const changed=()=>{if(!applying)return;clearTimeout(timeout);onRestart();finish?.();};
 serviceWorker.addEventListener('controllerchange',changed);
 const ready=serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(value=>{registration=value;registration.addEventListener('updatefound',observe);observe();offer();return registration;});
 ready.catch(error=>report('error','Could not enable updates: '+error.message));
 return {ready,get available(){return !!(registration?.waiting&&serviceWorker.controller);},get state(){return state;},
  async check(){report('checking');try{await ready;await registration.update();if(offer())return 'available';if(registration.installing){report('downloading');return 'downloading';}report('current');return 'current';}catch(error){report('error','Could not check for updates: '+error.message);return 'error';}},
  async apply(beforeRestart=async()=>{}){await ready;if(applying)return;const worker=registration.waiting;if(!worker)throw Error('The update is not ready yet. Keep the game online while it downloads.');await beforeRestart();applying=true;return new Promise((resolve,rejectApply)=>{finish=resolve;reject=rejectApply;timeout=setTimeout(()=>{applying=false;report('error','Restart did not complete. Your campaign was saved; close and reopen this window.');reject(Error('Restart did not complete. Your update checkpoint was saved; close and reopen this window.'));},20000);try{worker.postMessage({type:'ACTIVATE_UPDATE'});}catch(error){clearTimeout(timeout);applying=false;report('error',error.message);reject(error);}});},
  dispose(){clearTimeout(timeout);clearTimeout(downloadTimer);serviceWorker.removeEventListener('controllerchange',changed);}
 };
}
