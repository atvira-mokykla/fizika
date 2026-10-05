/* Original Open School learning-mode checker. MIT. No exam-system parity claim. */
export function parseNumber(raw) {
  if (typeof raw !== 'string' || raw.length > 80) return null;
  let text = raw.trim().replace(/\u2212/g, '-').replace(/[\u00a0\u202f]/g, ' ');
  // The value field contains only a number. Units are selected separately.
  text = text.replace(/\s*[×x]\s*10\^([+-]?\d+)$/i, 'e$1');
  const match = /^([+-]?)(\d{1,3}(?: \d{3})+|\d+)([.,]\d+)?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match) return null;
  const normalized = match[1] + match[2].replaceAll(' ', '') + (match[3] || '').replace(',', '.') + (match[4] === undefined ? '' : 'e' + match[4]);
  const value = Number(normalized);
  return Number.isFinite(value) ? {value, normalized} : null;
}

export function checkQuantity(raw, unit, spec) {
  const parsed = parseNumber(raw);
  if (!parsed) return {code: 'format', message: 'Įrašyk tik skaičių, pvz., 16,8 arba 16800. Vienetą pasirink atskirai. Kablelis ir taškas reiškia dešimtainį skirtuką.'};
  const conversions = {
    'energy-transfer': {J: x => x, kJ: x => x * 1000},
    'absolute-temperature': {'°C': x => x + 273.15, K: x => x},
    'temperature-difference': {'°C': x => x, K: x => x},
    'ratio': {'1': x => x, '%': x => x / 100},
    'signed-component': {'m/s': x => x, 'km/h': x => x / 3.6},
  };
  const converter = conversions[spec.quantity]?.[unit];
  if (!spec.accepted_units.includes(unit) || !converter) return {code: 'unit', message: 'Šiam dydžiui pasirink užduotyje nurodytą vienetą.'};
  const actual = converter(parsed.value);
  if (!Number.isFinite(actual)) return {code: 'format', message: 'Skaičius per didelis. Patikrink laipsnį ir vienetą.'};
  if (spec.quantity === 'absolute-temperature' && actual < 0) return {code: 'range', message: 'Absoliuti temperatūra negali būti mažesnė už 0 K. Patikrink temperatūros skalę.'};
  const tolerance = Math.max(spec.absolute_tolerance_si, spec.relative_tolerance * Math.abs(spec.expected_si));
  const delta = Math.abs(actual - spec.expected_si);
  const epsilon = 8 * Number.EPSILON * Math.max(1, Math.abs(actual), Math.abs(spec.expected_si));
  if (delta <= tolerance + epsilon) return {code: 'correct', normalized: parsed.normalized, message: 'Skaitinė reikšmė ir vienetas tinka. Patikrink ir savo sprendimo paaiškinimą.'};
  if (spec.expected_si * actual < 0) return {code: 'sign', message: 'Patikrink užduoties ženklų sutartį ir temperatūros pokyčio kryptį.'};
  return {code: 'value', normalized: parsed.normalized, message: 'Dar patikrink masės vienetą, temperatūros skirtumą ir skaičiavimo veiksmus. Įvestas skaičius suprastas kaip ' + parsed.normalized + '.'};
}
