import { analyseTrial, emptyNotebook, heating, mixing, nfmt, NOTEBOOK_KEY, noteKeys, reading, readingKeys, metaKeys, syntheticNotebook, validateNotebook, type Lang, type Notebook } from './thermal';
import { temperatureScene, heaterScene, heatingGraph, mixingScene, balanceScene, systemScene, type HeatingRun } from './thermal-svg';

const stops = new Set<() => void>();
function loadNotebook(): Notebook | null {
  try { return validateNotebook(JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || 'null')); } catch { return null; }
}
function download(book: Notebook) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(book, null, 2)], {type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'physics-water-mixing-notebook.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function cellRow(table: HTMLElement, values: string[], selected = false) {
  const row = document.createElement('tr'); row.classList.toggle('is-point', selected);
  values.forEach((value, i) => { const cell = document.createElement(i ? 'td' : 'th'); if (!i) cell.setAttribute('scope','row'); cell.textContent = value; row.append(cell); });
  table.append(row);
}
export function initThermalLabs() {
  if (document.documentElement.classList.contains('am-print')) return;
  document.querySelectorAll<HTMLElement>('[data-thermal]').forEach(root => {
    if (root.dataset.initialized) return; root.dataset.initialized = 'true';
    const lang: Lang = root.dataset.lang === 'lt' ? 'lt' : 'en';
    const t = (en: string, lt: string) => lang === 'lt' ? lt : en;
    const fmt = (n: number, digits = 2) => nfmt(n, lang, digits);
    const q = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    const listen = (selector: string, action: () => void) => q(selector).addEventListener('click', action);
    listen('[data-enlarge]', () => {
      const enlarged = root.classList.toggle('th-enlarged');
      q('[data-enlarge]').setAttribute('aria-pressed',String(enlarged));
      q('[data-enlarge]').textContent = enlarged ? t('Fit diagrams to screen','Sutalpinti schemas ekrane') : t('Enlarge diagrams · scroll sideways','Padidinti schemas · slink į šonus');
    });
    const sourceName = (book: Notebook) => ({'entered-measurement':t('Pupil-entered measurements', 'Mokinio įvesti matavimai'),'supplied-synthetic':t('Supplied synthetic practice data', 'Pateikti sintetiniai pratybų duomenys'),simulation:t('Simulation values', 'Simuliacijos reikšmės')})[book.source];

    if (root.dataset.thermal === 'temperature') {
      let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const draw = () => {
        const warm = q<HTMLSelectElement>('[data-temperature]').value === '35';
        q('[data-scene]').innerHTML = temperatureScene(lang, warm, q<HTMLInputElement>('[data-particles]').checked);
        root.classList.toggle('th-paused', paused);
        q('[data-motion]').textContent = paused ? t('Play particle motion','Rodyti dalelių judėjimą') : t('Pause particle motion','Sustabdyti dalelių judėjimą');
        q('[data-b-c]').textContent = warm ? '35' : '20'; q('[data-b-k]').textContent = fmt(warm ? 308.15 : 293.15);
        q('[data-temperature-explanation]').textContent = warm
          ? t('B is warmer. In thermal contact, net energy transfer would be from B to A. These controls choose illustrative states; this is not a measured time evolution.', 'B šiltesnis. Esant šiluminiam kontaktui grynasis energijos perdavimas vyktų iš B į A. Valdikliai parenka iliustracines būsenas; tai nėra išmatuota kitimo laike eiga.')
          : t('Both samples are at 20 °C. Water B has twice the mass; equal temperature alone does not establish equal total internal energy.', 'Abiejų temperatūra 20 °C. Vandens B masė dviguba; vien vienoda temperatūra neparodo visos vidinės energijos lygybės.');
      };
      q('[data-temperature]').addEventListener('change',draw); q('[data-particles]').addEventListener('change',draw);
      listen('[data-motion]', () => { paused = !paused; draw(); }); draw();
    }

    if (root.dataset.thermal === 'heating') {
      let run: HeatingRun = {mass:.2,power:42,time:0}; let previous: HeatingRun | undefined; let timer: ReturnType<typeof setInterval> | undefined; let point = 0;
      interface Entry { mass: number; power: number; prediction: string; reason: string; evidence: string; revisions: string[] }
      const entries: Entry[] = []; let entry: Entry | undefined;
      const renderHistory = () => {
        const list = q('[data-history]'); list.replaceChildren();
        entries.forEach(e => { const li = document.createElement('li'); li.textContent = `${fmt(e.mass * 1000)} g · ${e.power} W. ${e.prediction || t('Prediction left open','Prognozė nepasirinkta')}. ${e.reason} ${e.evidence} ${e.revisions.join(' → ')}`; list.append(li); });
      };
      const snapshot = () => {
        const prediction = q<HTMLSelectElement>('[data-prediction]');
        entry = {mass:run.mass,power:run.power,prediction:prediction.value ? prediction.selectedOptions[0].textContent || '' : '',reason:q<HTMLTextAreaElement>('[data-prediction-reason]').value,evidence:'',revisions:[]};
        entries.push(entry); renderHistory();
      };
      const stop = () => {
        if (timer !== undefined) clearInterval(timer); timer = undefined; stops.delete(stop);
        q<HTMLButtonElement>('[data-pause]').disabled = true;
        q<HTMLSelectElement>('[data-mass]').disabled = false; q<HTMLSelectElement>('[data-power]').disabled = false;
      };
      const status = () => {
        const value = heating(run.mass,run.power,run.time);
        q('[data-run-status]').textContent = `${t('Simulation','Simuliacija')}: ${fmt(run.mass*1000)} g · ${run.power} W · ${fmt(run.time,0)} s → ${fmt(value.temperature)} °C · ${fmt(value.energy,0)} J. ${previous ? t('Dashed line is the kept comparison.', 'Brūkšniuota linija – išsaugotas palyginimas.') : t('Keep a completed run before changing mass.', 'Prieš keisdamas masę išsaugok baigtą bandymą.')}`;
      };
      const draw = () => {
        q<HTMLSelectElement>('[data-point]').value=[0,50,100,150,200].includes(point)?String(point):'live';
        q('[data-scene]').innerHTML = heaterScene(lang,run.mass,run.power,Math.min(point,run.time));
        q('[data-graph]').innerHTML = heatingGraph(lang,run,previous,point);
        const table = q('[data-heating-table]'); table.replaceChildren();
        for (const seconds of [0,50,100,150,200]) {
          const v = heating(run.mass,run.power,seconds);
          cellRow(table,[String(seconds),seconds <= run.time ? fmt(v.temperature) : '—',seconds <= run.time ? fmt(v.energy,0) : '—',previous && seconds <= previous.time ? fmt(heating(previous.mass,previous.power,seconds).temperature) : '—'],point===seconds && point<=run.time);
        }
        q('[data-run-legend]').textContent = `${t('Solid','Vientisa')}: ${fmt(run.mass*1000)} g, ${run.power} W. ${previous ? `${t('Dashed','Brūkšniuota')}: ${fmt(previous.mass*1000)} g, ${previous.power} W.` : t('No kept run yet.', 'Išsaugoto bandymo dar nėra.')}`;
      };
      const evidence = () => { if (entry) { entry.evidence = `${fmt(run.time,0)} s → ${fmt(heating(run.mass,run.power,run.time).temperature)} °C.`; renderHistory(); } };
      const captureRevision = () => {
        const revision=q<HTMLTextAreaElement>('[data-revision]').value.trim();
        if(entry && revision && entry.revisions.at(-1)!==revision) entry.revisions.push(revision);
        renderHistory();
      };
      listen('[data-run]', () => {
        if (timer !== undefined) return;
        if (run.time >= 200) { captureRevision();run.time = 0; entry = undefined;q<HTMLTextAreaElement>('[data-revision]').value=''; }
        if (!entry) snapshot();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { run.time = 200; point = 200; draw(); status(); evidence(); return; }
        q<HTMLButtonElement>('[data-pause]').disabled = false;
        q<HTMLSelectElement>('[data-mass]').disabled = true; q<HTMLSelectElement>('[data-power]').disabled = true;
        stops.add(stop);
        timer = setInterval(() => {
          if (!root.isConnected || document.hidden || root.offsetParent === null) { stop(); status(); return; }
          run.time = Math.min(200,run.time+2); point = run.time; draw();
          if (run.time === 200) { stop(); status(); evidence(); }
        },100);
        status();
      });
      listen('[data-pause]',() => { stop(); status(); evidence(); });
      listen('[data-finish]',() => { stop(); if (!entry) snapshot(); run.time=200;point=200;draw();status();evidence(); });
      listen('[data-keep]',() => {
        stop(); previous={...run}; status(); draw(); evidence();
        if (!run.time) q('[data-run-status]').textContent += t(' This run only contains the initial reading; run it to compare warming.', ' Šiame bandyme yra tik pradinis rodmuo; paleisk, kad palygintum šilimą.');
      });
      listen('[data-reset]',() => { stop(); evidence();captureRevision();run.time=0;point=0;entry=undefined;q<HTMLTextAreaElement>('[data-revision]').value='';draw();status(); });
      for (const selector of ['[data-mass]','[data-power]']) q(selector).addEventListener('change',() => {
        stop();evidence();captureRevision();run={mass:Number(q<HTMLSelectElement>('[data-mass]').value),power:Number(q<HTMLSelectElement>('[data-power]').value),time:0};point=0;entry=undefined;q<HTMLTextAreaElement>('[data-revision]').value='';draw();status();
      });
      q('[data-point]').addEventListener('change',() => { const selected=q<HTMLSelectElement>('[data-point]').value;point=selected==='live'?run.time:Number(selected);draw(); });
      listen('[data-record]',() => { if (!entry) snapshot(); captureRevision();evidence(); q('[data-run-status]').textContent=t('Comparison recorded below. Your predictions and revisions are not scored.', 'Palyginimas užrašytas toliau. Prognozės ir jų pataisymai nevertinami pažymiu.'); });
      draw();status();
    }

    let setBook: ((book: Notebook) => void) | undefined;
    if (root.dataset.thermal === 'apparatus') {
      const form = q<HTMLFormElement>('[data-notebook]'); let source: Notebook['source'] = 'entered-measurement';
      const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement;
      const collect = () => {
        const book=emptyNotebook();book.source=source;
        for (const key of metaKeys) book.meta[key]=field(`meta.${key}`).value;
        for (let i=0;i<2;i++) for (const key of [...readingKeys,...noteKeys]) book.trials[i][key]=field(`${i}.${key}`).value;
        return book;
      };
      setBook = book => {
        source=book.source;
        for (const key of metaKeys) field(`meta.${key}`).value=book.meta[key];
        for (let i=0;i<2;i++) for (const key of [...readingKeys,...noteKeys]) field(`${i}.${key}`).value=book.trials[i][key];
        q('[data-notebook-status]').textContent=`${sourceName(book)}. ${t('Check every raw reading and condition before using it.', 'Prieš naudodamas patikrink visus rodmenis ir sąlygas.')}`;
      };
      const saved=loadNotebook();if(saved)setBook(saved);
      const save = () => {
        try { localStorage.setItem(NOTEBOOK_KEY,JSON.stringify(collect()));q('[data-notebook-status]').textContent=`${sourceName(collect())}. ${t('Saved in this browser. Nothing was uploaded.', 'Išsaugota šioje naršyklėje. Niekas neįkelta.')}`; }
        catch { q('[data-notebook-status]').textContent=t('Browser storage is unavailable. Download the notebook or keep a paper record.', 'Naršyklės saugykla nepasiekiama. Atsisiųsk užrašus arba rašyk popieriuje.'); }
      };
      // Imported synthetic/model records retain provenance when edited. Start a new
      // empty notebook to collect actual measurements, never silently relabel data.
      listen('[data-save]',save);listen('[data-export]',()=>download(collect()));
      listen('[data-new-notebook]',()=>{
        // Archive the in-memory record before resetting the form. Saving the new
        // record is an explicit separate action; no stored notebook is deleted.
        download(collect());setBook!(emptyNotebook());
        q('[data-notebook-status]').textContent=t('Download prepared for previous entries. This blank notebook is for new measurements; save it when ready.', 'Paruoštas ankstesnių įrašų atsisiuntimas. Šie tušti užrašai skirti naujiems matavimams; išsaugok, kai būsi pasiruošęs.');
      });
      form.addEventListener('submit',event=>event.preventDefault());
      q('a').addEventListener('click',save);
    }

    if (root.dataset.thermal === 'balance') {
      let warmMass=.1;
      const draw=()=> {
        const v=mixing(.1,warmMass,20,40);
        q('[data-scene]').innerHTML=mixingScene(lang,warmMass);q('[data-balance-scene]').innerHTML=balanceScene(lang,v.coolChange,v.warmChange);
        q('[data-mixing-summary]').textContent=`${t('Ideal model','Idealus modelis')}: 100 g, 20 °C + ${fmt(warmMass*1000)} g, 40 °C → ${fmt(v.mass*1000)} g, ${fmt(v.ideal)} °C. ${t('No container heating or losses.', 'Indo ir nuostolių nepaisoma.')}`;
        const table=q('[data-mixing-table]');table.replaceChildren();
        cellRow(table,[t('Cool','Vėsus'),'100','20']);cellRow(table,[t('Warm','Šiltas'),fmt(warmMass*1000),'40']);cellRow(table,[t('Mixture','Mišinys'),fmt(v.mass*1000),fmt(v.ideal)]);
      };
      q('[data-warm-mass]').addEventListener('change',()=>{warmMass=Number(q<HTMLSelectElement>('[data-warm-mass]').value);draw();});
      q('[data-system]').addEventListener('change',()=>{q('[data-system-scene]').innerHTML=systemScene(lang,q<HTMLSelectElement>('[data-system]').value==='cup');});
      setBook=book=> {
        q('[data-source]').textContent=`${sourceName(book)}. ${t('Confirm the displayed raw inputs before interpreting calculations. The model diagrams above remain separate from these readings.', 'Prieš aiškindamas skaičiavimus patvirtink pateiktus pradinius duomenis. Aukščiau esantys modelio brėžiniai lieka atskiri nuo šių rodmenų.')}`;
        const area=q('[data-analysis-results]');area.replaceChildren();
        book.trials.forEach((trial,i)=>{
          const section=document.createElement('section');section.className='th-result';
          const heading=document.createElement('h4');heading.textContent=`${t('Trial','Bandymas')} ${i+1}`;section.append(heading);
          const raw=document.createElement('p');raw.textContent=`${trial.coolMass||'—'} g, ${trial.coolT||'—'} °C + ${trial.warmMass||'—'} g, ${trial.warmT||'—'} °C → ${trial.finalT||'—'} °C. ${t('Delay','Delsa')}: ${trial.delay||'—'} s.`;section.append(raw);
          const result=analyseTrial(trial);
          if(result) {
            const table=document.createElement('table');table.setAttribute('aria-label',heading.textContent);
            const body=document.createElement('tbody');table.append(body);
            cellRow(body,[t('Ideal prediction','Ideali prognozė'),`${fmt(result.ideal)} °C`]);
            cellRow(body,[t('Entered final reading','Įvestas galutinis rodmuo'),`${fmt(result.final)} °C`]);
            cellRow(body,[t('Cool-water ΔU','Vėsaus vandens ΔU'),`${fmt(result.coolChange,0)} J`]);
            cellRow(body,[t('Warm-water ΔU','Šilto vandens ΔU'),`${fmt(result.warmChange,0)} J`]);
            cellRow(body,[t('Water-only residual R','Vien vandens liekana R'),`${fmt(result.residual,0)} J`]);section.append(table);
            const probeStep=reading(book.meta.probeResolution);
            if(probeStep!==null && probeStep>0) { const p=document.createElement('p');p.textContent=`${t('Changing the final reading by one recorded display step changes R by','Pakeitus galutinį rodmenį viena užrašyta padala, R pakinta')} ${fmt(result.mass*4200*probeStep,0)} J. ${t('This is sensitivity, not a full uncertainty estimate.', 'Tai jautrumas, ne visas neapibrėžties įvertis.')}`;section.append(p); }
            if(result.final<Math.min(reading(trial.coolT)!,reading(trial.warmT)!) || result.final>Math.max(reading(trial.coolT)!,reading(trial.warmT)!)) { const p=document.createElement('p');p.textContent=t('Your final reading is outside the two initial temperatures. Preserve it, then check the readings, timing and model assumptions.', 'Galutinis rodmuo nepatenka tarp pradinių temperatūrų. Išsaugok jį, tada patikrink rodmenis, laiką ir modelio prielaidas.');section.append(p); }
          } else { const p=document.createElement('p');p.textContent=t('Not enough valid readings to calculate. Enter both positive masses (g), both initial temperatures and the final reading in lesson 3. No values have been invented.', 'Skaičiavimui trūksta tinkamų rodmenų. 3 pamokoje įrašyk abi teigiamas mases (g), pradines ir galutinę temperatūras. Reikšmės neišgalvotos.');section.append(p); }
          if(trial.observations) { const p=document.createElement('p');p.textContent=`${t('Observations','Stebėjimai')}: ${trial.observations}`;section.append(p); }
          area.append(section);
        });
      };
      listen('[data-load-notebook]',()=>{ const book=loadNotebook(); if(book)setBook!(book);else q('[data-source]').textContent=t('No valid saved notebook found. Save in lesson 3, open a notebook file, or choose the labelled synthetic route.', 'Tinkamų išsaugotų užrašų nėra. Išsaugok 3 pamokoje, atverk užrašų failą arba pasirink pažymėtą sintetinį kelią.'); });
      listen('[data-synthetic]',()=>setBook!(syntheticNotebook()));
      const book=loadNotebook();if(book)setBook(book);draw();
    }
    const input=root.querySelector<HTMLInputElement>('[data-import]');
    input?.addEventListener('change',async()=>{
      const file=input.files?.[0];if(!file || !setBook)return;
      const status=root.querySelector<HTMLElement>('[data-notebook-status], [data-source]')!;
      try {
        if(file.size>50000)throw new Error('Too large');
        const book=validateNotebook(JSON.parse(await file.text()));if(!book)throw new Error('Invalid notebook');
        setBook(book);
      }catch { status.textContent=t('This file is not a valid version 1 physics notebook with a declared data source. Your current record has not changed.', 'Šis failas nėra tinkami 1 versijos fizikos užrašai su nurodytu duomenų šaltiniu. Dabartiniai užrašai nepakeisti.'); }
      input.value='';
    });
  });
}
document.addEventListener('astro:before-swap',()=>{for(const stop of stops)stop();});
