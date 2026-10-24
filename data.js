// The values below are ILLUSTRATIVE estimates, NOT official food-composition records.
// Nutrients are per serving. The UI labels every example as a demo estimate.
export const DEMO_FOODS = [
  ['rice','白飯','主食','1 碗（150 g）',252,4.5,56,0.5,'🍚'],
  ['brown-rice','糙米飯','主食','1 碗（150 g）',225,4.2,48,1.6,'🍚'],
  ['toast','白吐司','主食','1 片（30 g）',80,2.5,14,1,'🍞'],
  ['sweet-potato','烤地瓜','主食','1 條（150 g）',195,2.5,45,0.2,'🍠'],
  ['oats','燕麥片','主食','1 份（40 g）',152,5,27,3,'🥣'],
  ['egg','水煮蛋','蛋白質','1 顆（50 g）',75,6.5,0.5,5,'🥚'],
  ['chicken','雞胸肉（熟）','蛋白質','100 g',165,31,0,3.6,'🍗'],
  ['tofu','板豆腐','蛋白質','100 g',88,9,3,5,'◻️'],
  ['salmon','鮭魚（熟）','蛋白質','100 g',205,22,0,12,'🐟'],
  ['braised-chicken','滷雞腿','蛋白質','1 份（120 g）',210,25,3,10,'🍗'],
  ['broccoli','水煮青花菜','蔬菜水果','1 份（100 g）',35,2.4,7,0.4,'🥦'],
  ['greens','燙青菜（含少量油）','蔬菜水果','1 份（150 g）',70,3,7,3,'🥬'],
  ['banana','香蕉','蔬菜水果','1 根（120 g）',105,1.3,27,0.4,'🍌'],
  ['apple','蘋果','蔬菜水果','1 顆（180 g）',95,0.5,25,0.3,'🍎'],
  ['soy','無糖豆漿','飲品','1 杯（300 mL）',100,9,6,4.5,'🥛'],
  ['milk','低脂鮮奶','飲品','1 杯（240 mL）',112,8,12,3.5,'🥛'],
  ['tea','無糖綠茶','飲品','1 瓶（500 mL）',0,0,0,0,'🍵'],
  ['latte','拿鐵咖啡（無糖）','飲品','1 杯（360 mL）',180,9,17,8,'☕'],
  ['riceball','鮪魚飯糰','外食','1 個',220,6,39,4,'🍙'],
  ['lunchbox','雞腿便當','外食','1 盒',700,35,90,22,'🍱'],
  ['beef-noodle','紅燒牛肉麵','外食','1 碗',650,31,75,24,'🍜'],
  ['egg-pancake','原味蛋餅','外食','1 份',290,11,34,12,'🥞'],
  ['bubble-tea','珍珠奶茶（全糖）','飲品','1 大杯',550,8,90,16,'🧋'],
  ['yogurt','原味優格','點心','1 杯（100 g）',90,4,9,4,'🍶'],
  ['crackers','蘇打餅乾','點心','1 小包',120,2,19,4,'🍪']
].map(([id, name, category, serving, kcal, protein, carbs, fat, emoji]) => ({
  id: `demo-${id}`, name, category, serving, kcal, protein, carbs, fat, emoji,
  source: 'demo'
}));

export const FOOD_CATEGORIES = ['全部', '主食', '蛋白質', '蔬菜水果', '外食', '飲品', '點心', '自訂'];

export const MEALS = [
  { id: 'breakfast', label: '早餐', sub: '早安，從一頓早餐開始', emoji: '☀️' },
  { id: 'lunch', label: '午餐', sub: '給午後一點能量', emoji: '🍱' },
  { id: 'dinner', label: '晚餐', sub: '舒服地結束今天', emoji: '🌙' },
  { id: 'snack', label: '點心／飲料', sub: '也別忘了生活中的小確幸', emoji: '🧋' }
];

export const DEMO_DAY = [
  ['egg', 'breakfast', 2], ['toast', 'breakfast', 2], ['soy', 'breakfast', 1],
  ['lunchbox', 'lunch', 1], ['tea', 'lunch', 1],
  ['banana', 'snack', 1], ['latte', 'snack', 1],
  ['rice', 'dinner', 1], ['chicken', 'dinner', 1.5], ['broccoli', 'dinner', 2]
];
