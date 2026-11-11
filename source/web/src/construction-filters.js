// Presentation filters only; native commands retain all build validation.
export function matchesConstruction(item,rules=[]){
 return rules.every(rule=>{
  const value=String(rule.value??'').trim();if(!value)return true;
  switch(rule.field){
   case 'name':return item.name.toLowerCase().includes(value.toLowerCase());
   case 'kind':return item.kind===value;
   case 'hull':return item.kind==='vehicle'&&String(item.hull)===value;
   case 'type':return item.kind==='vehicle'&&item.designType.toLowerCase()===value.toLowerCase();
   case 'vehicleType':return item.kind==='vehicle'&&item.vehicleType===value;
   case 'component':return item.kind==='vehicle'&&item.entries.some(e=>String(e.component)===value);
   case 'componentFamily':return item.kind==='vehicle'&&item.entries.some(e=>String(e.family)===value&&e.level>=Number(rule.minLevel||0));
   case 'facilityGroup':return item.kind==='facility'&&item.group===value;
   default:return false;
  }
 });
}
export function constructionChoices(snapshot,{yard=false,rules=[],latest=true}={}){
 const designs=snapshot.designs.filter(d=>['ship','base'].includes(d.vehicleType)===yard).map(d=>({...d,kind:'vehicle'}));
 const facilities=yard?[]:snapshot.catalog.facilities.filter(f=>!latest||f.latest!==false).map(f=>({...f,kind:'facility'}));
 return [...designs,...facilities].filter(item=>matchesConstruction(item,rules));
}
