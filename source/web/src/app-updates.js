// A waiting worker activates only after the player explicitly saves/restarts.
export function watchAppUpdates(serviceWorker,{onReady=()=>{},onRestart=()=>{}}={}){
 let registration,applying=false,finish,reject,timeout;
 const offer=()=>{if(registration?.waiting&&serviceWorker.controller&&!applying)onReady();};
 const changed=()=>{if(!applying)return;clearTimeout(timeout);onRestart();finish?.();};
 serviceWorker.addEventListener('controllerchange',changed);
 const ready=serviceWorker.register('./sw.js').then(value=>{registration=value;const found=()=>{const installing=registration.installing;if(installing)installing.addEventListener('statechange',()=>{if(installing.state==='installed')offer();});};registration.addEventListener('updatefound',found);found();offer();return registration;});
 ready.catch(()=>{});
 return {ready,get available(){return !!(registration?.waiting&&serviceWorker.controller);},async check(){await ready;await registration.update();offer();},async apply(beforeRestart=async()=>{}){await ready;if(applying)return;const worker=registration.waiting;if(!worker)throw Error('The update is not ready yet. Close and reopen the game after it downloads.');await beforeRestart();applying=true;return new Promise((resolve,rejectApply)=>{finish=resolve;reject=rejectApply;timeout=setTimeout(()=>{applying=false;reject(Error('Restart did not complete. Your update checkpoint was saved; close and reopen this window.'));},20000);try{worker.postMessage({type:'ACTIVATE_UPDATE'});}catch(error){clearTimeout(timeout);applying=false;reject(error);}});},dispose(){clearTimeout(timeout);serviceWorker.removeEventListener('controllerchange',changed);}};
}
