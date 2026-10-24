import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleNutrition, sumNutrition, lastSevenDays, moveISODate, isISODate, localISODate } from '../src/math.js';
import { validateState } from '../src/storage.js';

test('份數可為小數，營養數值按比例計算', () => {
  assert.deepEqual(scaleNutrition({ kcal: 100, protein: 10, carbs: 20, fat: 1 }, 1.5),
    { kcal: 150, protein: 15, carbs: 30, fat: 1.5 });
});
test('多餐加總不混用份數及日期', () => {
  assert.equal(sumNutrition([{ food: { kcal: 100 }, quantity: 2 }, { food: { kcal: 50 }, quantity: 0.5 }]).kcal, 225);
});
test('跨年和閏年日期處理', () => {
  assert.equal(moveISODate('2026-01-01', -1), '2025-12-31');
  assert.equal(moveISODate('2024-02-28', 1), '2024-02-29');
  assert.deepEqual(lastSevenDays('2026-10-24').slice(0, 1), ['2026-10-18']);
  assert.ok(isISODate('2024-02-29'));
  assert.ok(!isISODate('2025-02-29'));
  assert.match(localISODate(new Date(2026, 9, 24)), /^2026-10-24$/);
});
test('匯入資料的非法欄位會被拒絕', () => {
  assert.throws(() => validateState({ version: 1, entries: [], customFoods: [], settings: { kcalGoal: -100, proteinGoal: 90 } }));
  assert.throws(() => validateState({ version: 3, entries: [], customFoods: [] }));
});
