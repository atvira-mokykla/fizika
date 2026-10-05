import { heating, mixing, nfmt, waterHeight, type Lang } from './thermal.ts';
const ink = 'var(--am-ink)', green = 'var(--am-accent)', pink = 'var(--am-mark)', muted = 'var(--am-muted)';
const text = (x: number, y: number, s: string, size = 15, fill = ink, anchor = 'middle') => `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="${anchor}">${s}</text>`;
const arrow = (x1: number, y: number, x2: number, color = green) => `<path d="M${x1} ${y}H${x2}" fill="none" stroke="${color}" stroke-width="3"/><path d="M${x2 - Math.sign(x2 - x1) * 8} ${y - 5}L${x2} ${y}l${-Math.sign(x2 - x1) * 8} 5" fill="none" stroke="${color}" stroke-width="3"/>`;
function svg(title: string, body: string, width = 500, height = 300) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title><g font-family="inherit">${body}</g></svg>`;
}
function beaker(x: number, y: number, mass: number, temperature: number, name: string, lang: Lang, width = 92, capacity = .4, temperatureLabel = true, massLabel = true) {
  const h = waterHeight(mass, capacity, 126);
  return `<rect x="${x + 3}" y="${y + 133 - h}" width="${width - 6}" height="${h}" rx="2" fill="${green}" opacity=".2" data-water-mass="${mass}"/><path d="M${x} ${y}v136q0 8 8 8h${width - 16}q8 0 8 -8V${y}" fill="none" stroke="${ink}" stroke-width="2.5"/>${text(x + width / 2, y - 18, name, 16)}${massLabel ? text(x + width / 2, y + 167, `${nfmt(mass * 1000, lang)} g`, 16) : ''}<rect x="${x + width - 24}" y="${y + 10}" width="9" height="96" rx="4" fill="var(--am-surface)" stroke="${ink}"/><rect x="${x + width - 22}" y="${y + 100 - temperature * 1.9}" width="5" height="${temperature * 1.9}" fill="${pink}"/><circle cx="${x + width - 19.5}" cy="${y + 109}" r="7" fill="${pink}"/>${temperatureLabel ? text(x + width / 2, y + 195, `${nfmt(temperature, lang)} °C`, 19, ink) : ''}`;
}
export function temperatureScene(lang: Lang, warm = false, particles = false) {
  const lt = lang === 'lt';
  let body = beaker(80, 65, .1, 20, lt ? 'Vanduo A' : 'Water A', lang) + beaker(320, 65, .2, warm ? 35 : 20, lt ? 'Vanduo B' : 'Water B', lang);
  body += text(250, 24, warm ? (lt ? 'Skirtinga temperatūra' : 'Different temperatures') : (lt ? 'Vienoda temperatūra · skirtinga masė' : 'Same temperature · different mass'), 16);
  if (warm) body += arrow(301, 148, 198) + text(250, 178, lt ? 'Energija' : 'Energy', 14, green) + text(250, 295, lt ? 'Įsivaizduok šiluminį kontaktą; vanduo nesimaišo.' : 'Imagine thermal contact; the water does not mix.', 13, muted);
  else body += text(250, 295, lt ? 'Termometras neparodo visos vidinės energijos.' : 'A thermometer does not measure total internal energy.', 14, muted);
  if (particles) {
    for (const [i, x] of [80, 320].entries()) {
      const count = i ? 24 : 12;
      for (let j = 0; j < count; j++) body += `<circle class="th-particle ${warm && i ? 'th-fast' : ''}" style="--delay:${-j * .17}s;--duration:${.8 + (j % 4) * .21}s" cx="${x + 10 + (j % 6) * 12}" cy="${192 - Math.floor(j / 6) * 9}" r="3" fill="${ink}"/>`;
    }
  }
  return svg(lt ? 'Vandens masės, temperatūros ir šilumos perdavimo palyginimas' : 'Compare water amounts, temperatures and heat transfer', body, 500, 320);
}
export function heaterScene(lang: Lang, mass = .2, power = 42, seconds = 0) {
  const lt = lang === 'lt', model = heating(mass, power, seconds);
  let b = beaker(190, 63, mass, model.temperature, lt ? 'Skystas vanduo' : 'Liquid water', lang, 92, .4, false, false);
  b += `<rect x="167" y="245" width="138" height="30" rx="9" fill="var(--am-accent-soft)" stroke="${green}"/>${text(236, 265, `${power} W`, 16, green)}<path d="M216 237v-28m-6 6 6-6 6 6M256 237v-28m-6 6 6-6 6 6" fill="none" stroke="${green}" stroke-width="2"/>`;
  b += text(75, 97, lt ? 'Modelio laikas' : 'Virtual time', 14, muted) + text(75, 124, `${nfmt(seconds, lang, 0)} s`, 23) + text(75, 190, lt ? 'Vandens masė' : 'Water mass', 14, muted) + text(75, 217, `${nfmt(mass*1000,lang)} g`, 22) + text(402, 97, lt ? 'Vandeniui' : 'To the water', 14, muted) + text(402, 125, `${nfmt(model.energy, lang, 0)} J`, 20, green) + text(402, 180, `${nfmt(model.temperature, lang)} °C`, 23);
  b += text(250, 308, lt ? 'Galia tenka vandeniui; indo ir nuostolių nepaisoma.' : 'Power reaches water; container and losses are ignored.', 13, muted);
  return svg(lt ? 'Idealus vandens šildymo bandymas su termometru' : 'Ideal water-heating experiment with a temperature probe', b, 500, 330);
}
export interface HeatingRun { mass: number; power: number; time: number }
export function heatingGraph(lang: Lang, run: HeatingRun, previous?: HeatingRun, point = 100) {
  const lt = lang === 'lt'; let b = '';
  for (let t = 0; t <= 200; t += 50) b += `<path d="M${55 + t * 2} 30V235" stroke="var(--am-line)"/>${text(55 + t * 2, 258, String(t), 14)}`;
  for (let T = 20; T <= 40; T += 5) b += `<path d="M55 ${235 - (T - 20) * 10}H455" stroke="var(--am-line)"/>${text(42, 240 - (T - 20) * 10, String(T), 14, ink, 'end')}`;
  b += `<path d="M55 25V235H463" stroke="${ink}" stroke-width="2" fill="none"/>${text(30, 17, 'T (°C)', 14)}${text(426, 284, 't (s)', 14)}`;
  const line = (r: HeatingRun, old = false) => `<path d="M55 235L${55 + r.time * 2} ${235 - (heating(r.mass, r.power, r.time).temperature - 20) * 10}" stroke="${old ? muted : green}" stroke-width="3" ${old ? 'stroke-dasharray="7 5"' : ''} fill="none"/>`;
  if (previous) b += line(previous, true);
  b += line(run);
  if (point <= run.time) b += `<circle cx="${55 + point * 2}" cy="${235 - (heating(run.mass, run.power, point).temperature - 20) * 10}" r="6" fill="${green}" stroke="var(--am-surface)" stroke-width="2"/>`;
  return svg(lt ? 'Temperatūros ir modelio laiko grafikas; vientisa dabartinė kreivė, brūkšniuota ankstesnė' : 'Temperature against virtual time; solid current run, dashed previous run', b);
}
export function apparatusScene(lang: Lang) {
  const lt = lang === 'lt';
  let b = beaker(35, 72, .1, 40, lt ? 'Šiltas ≤ 40 °C' : 'Warm ≤ 40 °C', lang) + beaker(215, 72, .1, 20, lt ? 'Vėsus inde' : 'Cool in cup', lang);
  b += `<rect x="209" y="94" width="106" height="129" rx="12" fill="none" stroke="${green}" stroke-width="3" stroke-dasharray="5 3"/>${arrow(143, 147, 195)}${text(167, 177, lt ? 'Pilti' : 'Pour', 14, green)}`;
  b += `<path d="M287 82V12h58v40" stroke="${ink}" stroke-width="2" fill="none"/>${text(375, 32, lt ? 'Zondas' : 'Probe', 14)}${text(404, 81, lt ? 'Svarstyklės' : 'Balance', 14)}<rect x="350" y="94" width="108" height="60" rx="9" fill="var(--am-surface-2)" stroke="${ink}"/>${text(404, 133, '100 g', 20)}${text(405, 207, lt ? 'Laikmatis' : 'Timer', 14)}<rect x="357" y="220" width="96" height="40" rx="9" fill="var(--am-surface-2)" stroke="${ink}"/>${text(405, 247, '00:00', 19)}`;
  b += text(250, 295, lt ? 'Zondas panardintas, neliečia sienelės ar dugno.' : 'Probe immersed, away from the wall and bottom.', 14, muted);
  return svg(lt ? 'Vandens maišymo įranga ir pylimo kryptis; schema' : 'Water-mixing equipment and pour direction; schematic', b, 500, 320);
}
export function mixingScene(lang: Lang, warmMass = .1) {
  const lt = lang === 'lt', model = mixing(.1, warmMass, 20, 40);
  const b = beaker(30, 66, .1, 20, lt ? 'Vėsus' : 'Cool', lang) + beaker(190, 66, warmMass, 40, lt ? 'Šiltas' : 'Warm', lang) + beaker(350, 66, model.mass, model.ideal, lt ? 'Mišinys' : 'Mixture', lang) + text(154, 147, '+', 28) + arrow(298, 147, 335) + text(250, 303, lt ? 'Lygis rodo vandens kiekį; termometras – temperatūrą.' : 'Level shows water amount; thermometer shows temperature.', 13, muted);
  return svg(lt ? 'Idealus maišymas: tūris priklauso nuo masės, o ne temperatūros' : 'Ideal mixing: volume depends on mass, not temperature', b, 500, 320);
}
export function balanceScene(lang: Lang, coolChange = 4200, warmChange = -4200) {
  const lt = lang === 'lt', scale = Math.max(Math.abs(coolChange), Math.abs(warmChange), 1);
  let b = `<rect x="38" y="44" width="424" height="151" rx="18" fill="none" stroke="${green}" stroke-width="2" stroke-dasharray="7 5"/>${text(250, 28, lt ? 'Sistema: abi vandens dalys' : 'System: both water portions', 17)}<rect x="64" y="78" width="118" height="72" rx="12" fill="var(--am-accent-soft)"/>${text(123, 105, lt ? 'Vėsus vanduo' : 'Cool water', 15)}${text(123, 133, `${coolChange >= 0 ? '+' : '−'}${nfmt(Math.abs(coolChange), lang, 0)} J`, 18)}<rect x="318" y="78" width="118" height="72" rx="12" fill="var(--am-mark-soft)"/>${text(377, 105, lt ? 'Šiltas vanduo' : 'Warm water', 15)}${text(377, 133, `${warmChange >= 0 ? '+' : '−'}${nfmt(Math.abs(warmChange), lang, 0)} J`, 18)}${arrow(308, 115, 192)}${text(250, 167, lt ? 'Perdavimas sistemos viduje' : 'Transfer inside the system', 14, green)}`;
  b += `<path d="M250 212v48" stroke="${ink}" stroke-width="2"/>${text(240, 235, '0', 14, muted, 'end')}`;
  b += `<rect x="${coolChange >= 0 ? 250 : 250 - Math.abs(coolChange) / scale * 155}" y="212" width="${Math.abs(coolChange) / scale * 155}" height="13" fill="${green}"/><rect x="${warmChange >= 0 ? 250 : 250 - Math.abs(warmChange) / scale * 155}" y="245" width="${Math.abs(warmChange) / scale * 155}" height="13" fill="${pink}"/>${text(250, 287, lt ? 'Vidinės energijos pokyčiai, ne „šiluma vandenyje“' : 'Changes in internal energy, not “heat in water”', 13, muted)}`;
  return svg(lt ? 'Vandens sistemos riba ir energijos pokyčiai maišant' : 'Water-system boundary and energy changes during mixing', b, 500, 305);
}
/** Qualitative real-experiment accounting diagram, separate from ideal values. */
export function systemScene(lang: Lang, wide = false) {
  const lt = lang === 'lt';
  let b = `<rect x="38" y="45" width="424" height="${wide ? 241 : 130}" rx="18" fill="none" stroke="${green}" stroke-width="2" stroke-dasharray="7 5"/>${text(250,25,wide ? (lt?'Sistema: vanduo ir indas':'System: water and cup') : (lt?'Sistema: tik vanduo':'System: water only'),18)}`;
  b += `<rect x="65" y="76" width="116" height="58" rx="9" fill="var(--am-accent-soft)"/>${text(123,111,lt?'Vėsus vanduo':'Cool water',14)}<rect x="319" y="76" width="116" height="58" rx="9" fill="var(--am-mark-soft)"/>${text(377,111,lt?'Šiltas vanduo':'Warm water',14)}${arrow(310,105,190)}`;
  b += `<path d="M250 144v58m-5-8 5 8 5-8" fill="none" stroke="${muted}" stroke-width="2" stroke-dasharray="4 3"/><rect x="194" y="211" width="112" height="50" rx="10" fill="var(--am-surface-2)" stroke="${ink}"/>${text(250,242,lt?'Vėsesnis indas':'Cooler cup',14)}${text(363,184,lt?'Galimas perdavimas':'Possible transfer',13,muted)}`;
  b += text(250,318,wide ? (lt?'Vandens ir indo mainai dabar sistemos viduje.':'Water–cup exchange is now inside the boundary.') : (lt?'Vandens ir indo mainai kerta vandens ribą.':'Water–cup exchange crosses the water-only boundary.'),14,green);
  b += text(250,345,lt?'Kokybinė schema: mainų dydis nenustatytas.':'Qualitative diagram: transfer amount is not determined.',13,muted);
  return svg(lt?'Sistemos ribos pasirinkimas realiame maišymo bandyme':'Choosing a system boundary for a real mixing experiment',b,500,365);
}
