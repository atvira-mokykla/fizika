import test from 'node:test';
import assert from 'node:assert/strict';
import { heating, mixing, waterHeight, emptyNotebook, syntheticNotebook, validateNotebook, analyseTrial, NOTEBOOK_KEY } from '../src/lib/thermal.ts';
import { temperatureScene, mixingScene } from '../src/lib/thermal-svg.ts';

test('Heating conserves delivered energy and obeys mass/power ratios',()=>{
  assert.equal(heating(.2,42,200).energy,8400);
  assert.equal(heating(.2,42,200).temperature,30);
  assert.equal(heating(.4,42,200).temperature,25);
  assert.equal(heating(.1,42,200).temperature,40);
  assert.equal(heating(.2,21,200).slope*2,heating(.2,42,200).slope);
  assert.equal(heating(.2,42,0).temperature,20);
  assert.equal(heating(.2,0,200).temperature,20);
  for(const mass of [.1,.2,.4]) for(const power of [21,42]) for(let t=0;t<=200;t++) {
    const v=heating(mass,power,t);
    assert.ok(v.temperature>=20&&v.temperature<=40);
    assert.ok(Math.abs(mass*4200*(v.temperature-20)-v.energy)<1e-8);
  }
});
test('Mixing midpoint, weights, energy balance and scale offset agree',()=>{
  assert.equal(mixing(.1,.1,20,40).ideal,30);
  assert.ok(Math.abs(mixing(.1,.2,20,40).ideal-100/3)<1e-10);
  assert.ok(Math.abs(mixing(.1,.2,293.15,313.15).ideal-273.15-mixing(.1,.2,20,40).ideal)<1e-10);
  for(const cool of [.05,.1,.2])for(const warm of [.05,.1,.2]) {
    const v=mixing(cool,warm,18,36);assert.ok(v.ideal>=18&&v.ideal<=36);
    assert.ok(Math.abs(v.coolChange+v.warmChange)<1e-8);
    assert.equal(v.mass,cool+warm);
  }
});
test('Water heights encode amount independently of temperature, particle size stays fixed',()=>{
  const waterRects=(svg:string)=>[...svg.matchAll(/<rect[^>]*data-water-mass="[^"]+"[^>]*\/>/g)].map(m=>m[0]);
  assert.deepEqual(waterRects(temperatureScene('en',false)),waterRects(temperatureScene('en',true)));
  assert.equal(waterHeight(.2),2*waterHeight(.1));
  assert.equal(waterHeight(.3),waterHeight(.1)+waterHeight(.2));
  const cold=temperatureScene('en',false,true),warm=temperatureScene('en',true,true);
  assert.equal((cold.match(/class="th-particle/g)||[]).length,36);
  assert.equal((warm.match(/class="th-particle/g)||[]).length,36);
  assert.equal((cold.match(/r="3"/g)||[]).length,(warm.match(/r="3"/g)||[]).length);
  const masses=[...mixingScene('lt',.2).matchAll(/data-water-mass="([^"]+)"/g)].map(m=>Number(m[1]));
  assert.ok(Math.abs(masses[2]-.3)<1e-10);assert.equal(masses[2],masses[0]+masses[1]);
});
test('Synthetic and entered records stay distinct and raw comma readings survive',()=>{
  const book=emptyNotebook();assert.ok(NOTEBOOK_KEY.startsWith('physics.am.'));
  Object.assign(book.trials[0],{coolMass:'100',warmMass:'100',coolT:'20,0',warmT:'40,0',finalT:'29,2'});
  const parsed=validateNotebook(JSON.parse(JSON.stringify(book)))!;
  assert.equal(parsed.source,'entered-measurement');assert.equal(parsed.trials[0].finalT,'29,2');
  assert.ok(Math.abs(analyseTrial(parsed.trials[0])!.residual-672)<1e-8);
  assert.equal(analyseTrial(parsed.trials[1]),null);
  const synthetic=syntheticNotebook();assert.equal(synthetic.source,'supplied-synthetic');
  assert.ok(Math.abs(analyseTrial(synthetic.trials[1])!.residual-504)<1e-8);
});
test('Imports reject missing provenance or malformed shape; anomalies remain observable',()=>{
  const valid=emptyNotebook();
  assert.equal(validateNotebook({...valid,source:undefined}),null);
  assert.equal(validateNotebook({...valid,version:2}),null);
  assert.equal(validateNotebook({...valid,trials:[{}]}),null);
  assert.equal(validateNotebook({...valid,meta:null}),null);
  Object.assign(valid.trials[0],{coolMass:'100',warmMass:'100',coolT:'20',warmT:'40',finalT:'45'});
  assert.equal(analyseTrial(valid.trials[0])?.final,45);
  valid.trials[0].coolMass='-100';assert.equal(analyseTrial(valid.trials[0]),null);
  valid.trials[0].coolMass='Infinity';assert.equal(analyseTrial(valid.trials[0]),null);
});
test('Invalid physical inputs fail rather than producing plausible-looking diagrams',()=>{
  assert.throws(()=>heating(0,42,200),RangeError);
  assert.throws(()=>heating(.1,42,NaN),RangeError);
  assert.throws(()=>mixing(.1,-.1,20,40),RangeError);
  assert.throws(()=>mixing(.1,.1,20,40,Infinity),RangeError);
});
