import {checkQuantity} from './quantity-checker.mjs';

for (const form of document.querySelectorAll('[data-checker]')) {
  form.hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const spec = JSON.parse(form.dataset.checker);
    const result = checkQuantity(form.elements.value.value, form.elements.unit.value, spec);
    const feedback = form.querySelector('[role="status"]');
    feedback.textContent = result.message;
    feedback.dataset.result = result.code;
  });
}

const model = document.querySelector('[data-heating-model]');
if (model) {
  const select = model.querySelector('select');
  select.disabled = false;
  select.addEventListener('change', () => {
    const mass = Number(select.value);
    const rows = model.querySelectorAll('tbody tr');
    const temperatures = [];
    for (const row of rows) {
      const t = Number(row.dataset.time);
      const temperature = 20 + 42 * t / (mass * 4200);
      temperatures.push(temperature);
      row.cells[1].textContent = temperature.toLocaleString('lt-LT', {maximumFractionDigits: 2}) + ' °C';
    }
    model.querySelector('polyline').setAttribute('points', temperatures.map((v, i) => `${60 + i * 95},${260 - (v - 20) * 5}`).join(' '));
    model.querySelector('[role="status"]').textContent = 'Modelis perskaičiuotas: masė ' + select.value.replace('.', ',') + ' kg. Lentelėje pateikta temperatūra. Tai simuliacija, ne matavimai.';
  });
}
