import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const races=JSON.parse(fs.readFileSync(new URL('../assets/races.json',import.meta.url)));
test('all 16 original portraits are 128x128 alpha PNGs',()=>{for(const race of races){const b=fs.readFileSync(new URL('../'+race.image,import.meta.url));assert.equal(b.toString('ascii',1,4),'PNG');assert.equal(b.readUInt32BE(16),128);assert.equal(b.readUInt32BE(20),128);assert.equal(b[25],6,'RGBA required');}});
