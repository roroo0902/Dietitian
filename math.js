export function localISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function moveISODate(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + days, 12);
  return localISODate(date);
}

export function lastSevenDays(iso) {
  return Array.from({ length: 7 }, (_, i) => moveISODate(iso, i - 6));
}

export function scaleNutrition(food, quantity) {
  const qty = Number(quantity);
  return {
    kcal: (Number(food.kcal) || 0) * qty,
    protein: (Number(food.protein) || 0) * qty,
    carbs: (Number(food.carbs) || 0) * qty,
    fat: (Number(food.fat) || 0) * qty
  };
}

export function sumNutrition(entries) {
  return entries.reduce((out, entry) => {
    const n = scaleNutrition(entry.food, entry.quantity);
    for (const key of Object.keys(out)) out[key] += n[key];
    return out;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

export function numeric(value, max = 100000) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

export function isISODate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00`))
    && localISODate(new Date(`${date}T12:00:00`)) === date;
}

export function formatNumber(number, digits = 0) {
  return Number(number || 0).toLocaleString('zh-TW', { maximumFractionDigits: digits });
}
