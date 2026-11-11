// Summarize visible engine objects for map overlays; no colonization rules here.
export function sectorMarkers(objects){
 let display=null;for(const o of objects)if(!display||(o.stellarSize||0)>(display.stellarSize||0))display=o;
 const worlds=objects.filter(o=>o.kind==='planet');const owners=[];
 for(const o of worlds)if(o.owner!==null&&o.owner!==undefined&&!owners.some(e=>e.id===o.owner))owners.push({id:o.owner,name:o.ownerName,color:o.ownerColor});
 const breathable=worlds.filter(o=>o.colonization==='breathable').length;
 const domed=worlds.filter(o=>o.colonization==='domed').length;
 return {display,worlds:worlds.length,owners,breathable,domed};
}
