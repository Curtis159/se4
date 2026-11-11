export function designTypeNames(snapshot,extra=[]){
 return [...new Set([...(snapshot.catalog.designTypes||[]),...snapshot.designs.map(d=>d.designType),...(snapshot.obsoleteDesigns||[]).map(d=>d.designType),...extra].map(s=>String(s).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true})||a.localeCompare(b,'en'));
}
