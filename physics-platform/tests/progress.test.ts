import test from 'node:test';
import assert from 'node:assert/strict';
import { resetAll, exportAll, importAll, setPref, getPref, setDone, isDone } from '../src/lib/progress.ts';
const data = new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k),get length(){return data.size;},key:(i:number)=>[...data.keys()][i]}});
Object.defineProperty(globalThis,'document',{value:new EventTarget()});
test('Physics progress and deletion preserve mathematics on the shared GitHub Pages origin',()=>{
 data.set('am.progress.v1','mathematics');data.set('am.pref.year','12/a');data.set('another.app','keep');
 setPref('year','9');setDone('g9-thermal-01',true);assert.equal(getPref('year'),'9');assert.equal(isDone('g9-thermal-01'),true);
 const snapshot=JSON.parse(exportAll());assert.equal(snapshot.app,'atvira-mokykla-physics');assert.deepEqual(Object.keys(snapshot.data).sort(),['physics.am.pref.year','physics.am.progress.v1']);
 resetAll();assert.equal(data.get('am.progress.v1'),'mathematics');assert.equal(data.get('am.pref.year'),'12/a');assert.equal(data.get('another.app'),'keep');assert.equal(isDone('g9-thermal-01'),false);
 assert.equal(importAll(JSON.stringify(snapshot)),true);assert.equal(isDone('g9-thermal-01'),true);
 assert.equal(importAll(JSON.stringify({app:'atvira-mokykla',data:{'am.pref.year':'9'}})),false);assert.equal(data.get('am.pref.year'),'12/a');
 // Model the observed mathematics reset implementation: it removes every am.* key.
 [...data.keys()].filter(k=>k.startsWith('am.')).forEach(k=>data.delete(k));
 assert.equal(isDone('g9-thermal-01'),true);assert.equal(getPref('year'),'9');assert.equal(data.get('another.app'),'keep');
});
