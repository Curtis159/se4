export function availableDesignParts(components,hull,latestOnly=true){
 const compatible=components.filter(c=>c.allowedHulls.includes(hull));if(!latestOnly)return compatible;
 const key=c=>c.family?String(c.family):'part:'+c.id,newest=new Map();for(const c of compatible)newest.set(key(c),Math.max(newest.get(key(c))??-1,c.level??0));
 return compatible.filter(c=>(c.level??0)===newest.get(key(c)));
}
