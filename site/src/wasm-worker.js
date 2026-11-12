import createOpenSE4 from '../engine/opense4.mjs?build=28-55d20faf86c0ebc9';
let engine;
const ready=createOpenSE4({locateFile:name=>new URL('../engine/'+name,import.meta.url).href,printErr:message=>console.warn(message)}).then(m=>engine=m);
self.onmessage=async ({data:{id,method,args}})=>{
 try {
  await ready;
  const result=JSON.parse(engine.ccall('se4_call','string',['string','string'],[method,JSON.stringify(args)]));
  if(typeof result.error==='string' && !('accepted' in result)) throw new Error(result.error);
  self.postMessage({id,result});
 } catch(error){self.postMessage({id,error:error.message,stack:error.stack});}
};
