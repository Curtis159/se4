// Test input authored from the original catalog, not an in-game design preset.
import assert from 'node:assert/strict';
export function manualDesign(snapshot,name,colony=false){
 const hull=snapshot.catalog.hulls.find(h=>h.name===(colony?'Colony Ship':'Escort'));
 assert.ok(hull,'required test hull is not researched');
 const entries=[];
 for(const [componentName,count] of [['Bridge',1],['Life Support',1],['Crew Quarters',1],['Ion Engine I',colony?5:6],...(colony?[['Rock Colony',1],['Cargo Bay I',1]]:[['Capital Ship Missile I',1]])]){
  const component=snapshot.catalog.components.find(c=>c.name===componentName);
  assert.ok(component,'required original component unavailable: '+componentName);
  for(let i=0;i<count;i++)entries.push({component:component.id,mount:-1});
 }
 return {name,design_type:colony?'Colony Ship':'Attack Ship',hull:hull.id,entries};
}
