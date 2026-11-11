// Attention prompts only. Orders and construction remain engine-authoritative.
export function turnTasks(s,{readNews=0,ignored=[]}={}){
 if(!s||s.gameOver||!s.canAct)return [];
 const tasks=[];for(const planet of s.colonyTypeChoices||[]){const colony=s.colonies.find(c=>c.planet===planet);if(colony)tasks.push({id:'colony-type:'+planet,label:'Choose colony type',detail:colony.name,tab:'maps',planet});}
 if(s.questions?.length)tasks.push({id:"encounters",label:"Resolve encounter",detail:"Choose whether to enter",tab:"ships"});
 if(s.log.length>readNews)tasks.push({id:'news',label:'Read news',detail:'Latest turn events',tab:'log'});
 if((s.research.unspent??(!s.research.queue.length?s.research.pool:0))>0&&s.research.available.some(a=>!s.research.queue.some(q=>q.area===a.id)))tasks.push({id:'research',label:'Choose research',detail:(s.research.unspent??s.research.pool).toLocaleString()+' unallocated',tab:'research'});
 for(const ship of s.ships){const design=[...s.designs,...(s.obsoleteDesigns||[])].find(d=>d.id===ship.design);if(design?.vehicleType==='ship'&&ship.maxMovement>0&&!ship.orders.length&&!['mothballed','destroyed'].includes(ship.status))tasks.push({id:'ship:'+ship.id,label:'Give ship orders',detail:ship.name,tab:'ships',ship:ship.id});}
 for(const colony of s.colonies){
  if(colony.population===0)continue;
  for(const yard of colony.yards||[])if(!yard.queue.length&&!yard.onHold&&!yard.doNothing&&yard.rate.some(n=>n>0))tasks.push({id:'yard:'+colony.planet+':'+yard.lane,label:s.designs.some(d=>['ship','base'].includes(d.vehicleType))?'Set shipyard queue':'Design a ship',detail:colony.name,tab:s.designs.some(d=>['ship','base'].includes(d.vehicleType))?'maps':'designs',...(s.designs.some(d=>['ship','base'].includes(d.vehicleType))?{planet:colony.planet}:{})});
  if(colony.queue.length||colony.laborFocusActive||colony.onHold||!colony.constructionRate.some(n=>n>0))continue;
  const facility=colony.facilities<colony.facilitySlots&&s.catalog.facilities.length>0;
  const vehicle=s.designs.some(d=>(s.splitConstruction?!['ship','base'].includes(d.vehicleType):(colony.canBuildShips||!['ship','base'].includes(d.vehicleType))));
  if(facility||vehicle)tasks.push({id:'colony:'+colony.planet,label:'Set planet queue',detail:colony.name,tab:'maps',planet:colony.planet});
 }
 for(const ship of s.ships)if(ship.hasYard&&!ship.yardOnHold&&!ship.yardDoNothing&&!ship.yardQueue.length&&ship.yardRate.some(n=>n>0))tasks.push({id:'shipyard:'+ship.id,label:'Set shipyard queue',detail:ship.name,tab:'maps',ship:ship.id});
 return tasks.filter(t=>!ignored.includes(t.id));
}
