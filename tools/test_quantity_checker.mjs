import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNumber, checkQuantity} from '../physics-starter/assets/quantity-checker.mjs';

const energy = {quantity:'energy-transfer',expected_si:16800,accepted_units:['J','kJ'],absolute_tolerance_si:.01,relative_tolerance:0};
const temperature = {quantity:'absolute-temperature',expected_si:303.15,accepted_units:['°C','K'],absolute_tolerance_si:.01,relative_tolerance:0};
for (const [raw,expected] of [['16,8',16.8],['16.8',16.8],['1 500',1500],['1\u00a0500',1500],['1\u202f500',1500],['1,500',1.5],['2,5 × 10^3',2500],['2.5e3',2500],['−4',-4],['0',0]]) {
  test('Parse declared number grammar: '+raw,()=>assert.equal(parseNumber(raw)?.value,expected));
}
for (const raw of ['', '1,2.3','12 34','1 234 56','1,','NaN','Infinity','1e309','2**3','alert(1)','3 J','35 %','1/2','.5','--4']) {
  test('Reject unsupported/malformed number: '+raw,()=>assert.equal(parseNumber(raw),null));
}
for (const [raw,unit,expected] of [['16,8','kJ','correct'],['16800','J','correct'],['16.8','kJ','correct'],['16800','W','unit'],['16,8','J','value'],['-16800','J','sign']]) {
  test('Heat quantity: '+raw+' '+unit,()=>assert.equal(checkQuantity(raw,unit,energy).code,expected));
}
for (const [raw,unit,expected] of [['30','°C','correct'],['303,15','K','correct'],['30','K','value'],['-274','°C','range'],['303,15','°C','value']]) {
  test('Absolute temperature: '+raw+' '+unit,()=>assert.equal(checkQuantity(raw,unit,temperature).code,expected));
}
test('Temperature difference has no affine offset',()=>{
  const spec={...temperature,quantity:'temperature-difference',expected_si:10};
  assert.equal(checkQuantity('10','°C',spec).code,'correct');
  assert.equal(checkQuantity('10','K',spec).code,'correct');
});
test('Efficiency percent and fraction differ from a bare 35',()=>{
  const spec={...energy,quantity:'ratio',expected_si:.35,accepted_units:['1','%']};
  assert.equal(checkQuantity('35','%',spec).code,'correct');
  assert.equal(checkQuantity('0,35','1',spec).code,'correct');
  assert.equal(checkQuantity('35','1',spec).code,'value');
});
test('Signed velocity and conversion preserve reference direction',()=>{
  const spec={...energy,quantity:'signed-component',expected_si:-4,accepted_units:['m/s','km/h']};
  assert.equal(checkQuantity('-14,4','km/h',spec).code,'correct');
  assert.equal(checkQuantity('4','m/s',spec).code,'sign');
});
test('Absolute tolerance accepts its boundary and rejects a nearby outside value',()=>{
  const spec={...energy,expected_si:100,absolute_tolerance_si:1};
  assert.equal(checkQuantity('101','J',spec).code,'correct');
  assert.equal(checkQuantity('101,0001','J',spec).code,'value');
});
test('Relative tolerance and zero are well-defined',()=>{
  const spec={...energy,expected_si:100,absolute_tolerance_si:0,relative_tolerance:.01};
  assert.equal(checkQuantity('99','J',spec).code,'correct');
  assert.equal(checkQuantity('98,999','J',spec).code,'value');
  assert.equal(checkQuantity('0','J',{...spec,expected_si:0}).code,'correct');
  assert.equal(checkQuantity('1','J',{...spec,expected_si:0}).code,'value');
});
