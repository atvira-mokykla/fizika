import type { MountFn } from '../lib/figkit';
const mount: MountFn = ({box,bar,props,print,setCaption}) => {
 const lt=document.documentElement.lang.startsWith('lt'); const fmt=(v:number)=>new Intl.NumberFormat(lt?'lt-LT':'en-GB',{maximumFractionDigits:2}).format(v);
 const mode=props.mode || 'heating'; let mass=0.2, hotMass=0.1, temperature=20;
 const ns='http://www.w3.org/2000/svg'; const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 440 320');svg.style.width='100%';svg.style.height='100%';svg.setAttribute('aria-hidden','true');box.append(svg);
 const table=document.createElement('table');table.className='am-model-table';table.setAttribute('aria-label',lt?'Modelio duomenys':'Model data');box.after(table);
 function node(tag:string,attrs:Record<string,string|number>,text?:string){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);return n;}
 function row(cells:string[],head=false){const tr=document.createElement('tr');for(const t of cells){const c=document.createElement(head?'th':'td');c.textContent=t;if(head)c.setAttribute('scope','col');tr.append(c);}table.append(tr);}
 function draw(){svg.replaceChildren();table.replaceChildren();const cs=getComputedStyle(document.documentElement);const ink=cs.getPropertyValue('--am-ink').trim(),accent=cs.getPropertyValue('--am-accent').trim(),mark=cs.getPropertyValue('--am-mark').trim();
 if(mode==='heating'){
  node('line',{x1:55,y1:270,x2:405,y2:270,stroke:ink});node('line',{x1:55,y1:270,x2:55,y2:30,stroke:ink});
  for(let t=0;t<=200;t+=50){node('text',{x:55+t*1.7,y:291,fill:ink,'font-size':14,'text-anchor':'middle'},String(t));}
  for(let T=20;T<=40;T+=5)node('text',{x:45,y:274-(T-20)*11,fill:ink,'font-size':14,'text-anchor':'end'},String(T));
  node('text',{x:345,y:315,fill:ink,'font-size':16},'t (s)');node('text',{x:8,y:22,fill:ink,'font-size':16},'T (°C)');
  const points=[];row(['t (s)','T (°C)'],true);
  for(let t=0;t<=200;t+=50){const T=20+42*t/(mass*4200);points.push(`${55+t*1.7},${270-(T-20)*11}`);node('circle',{cx:55+t*1.7,cy:270-(T-20)*11,r:4,fill:accent});row([String(t),fmt(T)]);}
  node('polyline',{points:points.join(' '),fill:'none',stroke:accent,'stroke-width':3});
  setCaption(lt?`Idealus modelis: m = ${fmt(mass)} kg, P = 42 W, c = 4200 J/(kg·K). Per 200 s perduodama 8400 J; temperatūros pokytis ${fmt(8400/(mass*4200))} K. Nuostolių ir indo nepaisoma. Tai ne matavimai.`:`Ideal model: m = ${fmt(mass)} kg, P = 42 W, c = 4200 J/(kg·K). In 200 s, 8400 J is transferred; temperature rise ${fmt(8400/(mass*4200))} K. Container and losses ignored. These are not measurements.`);
 }else if(mode==='mixing'){
  const final=(0.1*20+hotMass*40)/(0.1+hotMass);const vals=[20,40,final];const names=lt?['Šaltas','Šiltas','Mišinys']:['Cool','Warm','Mixture'];
  row([lt?'Vanduo':'Water','m (kg)','T (°C)'],true);
  vals.forEach((T,i)=>{const x=40+i*140;node('rect',{x,y:70,width:90,height:180,fill:'none',stroke:ink,'stroke-width':2});node('rect',{x:x+2,y:250-T*4,width:86,height:T*4,fill:i===1?mark:accent,opacity:0.3});node('text',{x:x+45,y:275,fill:ink,'font-size':16,'text-anchor':'middle'},names[i]);node('text',{x:x+45,y:50,fill:ink,'font-size':18,'text-anchor':'middle'},`${fmt(T)} °C`);row([names[i],fmt(i===0?.1:i===1?hotMass:.1+hotMass),fmt(T)]);});
  setCaption(lt?`Idealus vandens maišymo modelis. Galutinė temperatūra ${fmt(final)} °C. Tas pats c, nuostolių ir indo šiluminės talpos nepaisoma; realaus matavimo tai neatstoja.`:`Ideal water-mixing model. Final temperature ${fmt(final)} °C. Same c, container and heat losses ignored; this does not replace a measurement.`);
 }else{
  const K=temperature+273.15;row(['°C','K'],true);row([fmt(temperature),fmt(K)]);
  node('text',{x:220,y:130,fill:accent,'font-size':42,'text-anchor':'middle'},`${fmt(temperature)} °C`);node('text',{x:220,y:205,fill:ink,'font-size':36,'text-anchor':'middle'},`${fmt(K)} K`);
  setCaption(lt?'Tas pats temperatūros dydis, dvi skalės: T(K) = t(°C) + 273,15. 1 °C pokytis yra 1 K pokytis. Tai nėra kūno vidinės energijos skaitiklis.':'The same temperature on two scales: T(K) = t(°C) + 273.15. A change of 1 °C is a change of 1 K. This is not a meter of internal energy.');
 }
 }
 if(!print){const label=document.createElement('label');label.className='am-slider';label.textContent=mode==='heating'?(lt?'Vandens masė':'Water mass'):mode==='mixing'?(lt?'Šilto vandens masė':'Warm-water mass'):(lt?'Temperatūra (°C)':'Temperature (°C)');
  const input=document.createElement('select'); input.className='am-btn';const values=mode==='heating'?[.1,.2,.4]:mode==='mixing'?[.05,.1,.2]:[0,20,30,40];
  for(const v of values){const o=document.createElement('option');o.value=String(v);o.textContent=fmt(v)+(mode==='scales'?' °C':' kg');o.selected=v===(mode==='heating'?.2:mode==='mixing'?.1:20);input.append(o);}label.append(input);bar.append(label);input.addEventListener('change',()=>{if(mode==='heating')mass=Number(input.value);else if(mode==='mixing')hotMass=Number(input.value);else temperature=Number(input.value);draw();});}
 draw();return {setState(){},redraw:draw};
};
export default mount;
