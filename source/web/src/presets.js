/** Data extracted by OpenSE4's native .emp decoder; not a replacement for the rules engine. */
export const normalize = name => String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
export function findPreset(race, presets) { return presets.find(p => normalize(p.file.replace(/\.emp$/i,'')) === normalize(race)) || presets.find(p => normalize(p.raceFolder) === normalize(race)); }
export function compareProfiles(a,b) {
  if (!a || !b) return [];
  return Object.keys(a.characteristicValues).filter(k=>a.characteristicValues[k]!==b.characteristicValues[k]);
}
export function validatePresets(races, presets) {
  for(const race of races) {
    const p=findPreset(race.name,presets);
    if(!p || p.traits.length!==14 || p.characteristics.length!==15)throw new Error('Original .emp preset missing or invalid: '+race.name);
  }
  return true;
}
