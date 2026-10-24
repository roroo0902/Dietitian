import { numeric, isISODate } from './math.js';

const KEY = 'nutriday-tw-v1';
const EMPTY = () => ({ version: 1, settings: { kcalGoal: 2000, proteinGoal: 90 }, entries: [], customFoods: [] });

export function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function cleanFood(food, custom = false) {
  if (!food || typeof food !== 'object') return null;
  const name = typeof food.name === 'string' ? food.name.trim().slice(0, 80) : '';
  const serving = typeof food.serving === 'string' ? food.serving.trim().slice(0, 50) : '';
  const kcal = numeric(food.kcal, 10000);
  const protein = numeric(food.protein, 1000);
  const carbs = numeric(food.carbs, 1000);
  const fat = numeric(food.fat, 1000);
  if (!name || !serving || [kcal, protein, carbs, fat].some(v => v === null)) return null;
  return {
    id: typeof food.id === 'string' && food.id.length <= 100 ? food.id : makeId(),
    name, serving, kcal, protein, carbs, fat,
    category: custom ? '自訂' : (typeof food.category === 'string' ? food.category.slice(0, 30) : '自訂'),
    emoji: custom ? '🥗' : (typeof food.emoji === 'string' ? food.emoji.slice(0, 5) : '🍽️'),
    source: custom ? 'custom' : (food.source === 'demo' ? 'demo' : 'custom')
  };
}

export function validateState(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.entries) || !Array.isArray(value.customFoods)) {
    throw new Error('資料格式不符合 營養茲 v1。');
  }
  if (value.entries.length > 20000 || value.customFoods.length > 1000) throw new Error('資料量超出第一版限制。');
  const kcalGoal = numeric(value.settings?.kcalGoal, 10000);
  const proteinGoal = numeric(value.settings?.proteinGoal, 1000);
  if (kcalGoal === null || kcalGoal < 500 || proteinGoal === null || proteinGoal < 1) throw new Error('目標設定不正確。');
  const entries = value.entries.map(e => {
    const food = cleanFood(e?.food);
    const quantity = numeric(e?.quantity, 100);
    if (!food || quantity === null || quantity <= 0 || !isISODate(e?.date) || !['breakfast','lunch','dinner','snack'].includes(e?.meal)) {
      throw new Error('飲食紀錄有無效欄位。');
    }
    return {
      id: typeof e.id === 'string' && e.id.length <= 100 ? e.id : makeId(),
      food, quantity, date: e.date, meal: e.meal,
      createdAt: typeof e.createdAt === 'string' ? e.createdAt.slice(0, 40) : new Date().toISOString()
    };
  });
  const customFoods = value.customFoods.map(f => {
    const food = cleanFood(f, true);
    if (!food) throw new Error('自訂食物的數值不正確。');
    return food;
  });
  const allIds = [...entries.map(e => e.id), ...customFoods.map(f => f.id)];
  if (new Set(allIds).size !== allIds.length) throw new Error('資料中包含重複識別碼。');
  return { version: 1, settings: { kcalGoal, proteinGoal }, entries, customFoods };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? validateState(JSON.parse(raw)) : EMPTY();
  } catch (error) {
    console.warn('無法讀取本機紀錄，未覆蓋現有資料。', error);
    return EMPTY();
  }
}

export function persistState(value) {
  localStorage.setItem(KEY, JSON.stringify(validateState(value)));
}

export function newState() { return EMPTY(); }
