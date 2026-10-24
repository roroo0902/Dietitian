export const BUDDY_NOTES = [
 '好好吃飯，是送給自己的一份小禮物。',
 '不必每餐都完美，照著自己的步調就很好。',
 '喜歡的食物和照顧自己，都可以一起存在。',
 '今天先記一餐，也是一個很棒的開始。',
 '把注意力留給味道，也留一點給自己。'
];
export function buddyArt() {
 return `<svg class="zizi-art" viewBox="0 0 240 205" role="img" aria-label="茲茲，一隻長著小嫩芽的微笑飯碗"><ellipse cx="120" cy="186" rx="62" ry="9" fill="#5c9a6d" opacity=".15"/><g class="zizi-body"><g class="zizi-leaf"><path d="M119 72V44" stroke="#347555" stroke-width="5" stroke-linecap="round"/><path d="M118 56C85 55 85 30 88 26c23 0 34 11 30 30Z" fill="#6dba65"/><path d="M122 49c0-27 19-37 39-33 0 24-16 35-39 33Z" fill="#40996a"/><path d="m122 47 25-20" stroke="#bfe6a0" stroke-width="2.5" stroke-linecap="round"/></g><g class="zizi-wave"><path d="M181 110q24-28 29-11" stroke="#347555" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="210" cy="97" r="9" fill="#eff3bd" stroke="#347555" stroke-width="3"/></g><path d="M59 112q-20 8-24-8" stroke="#347555" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M91 164 84 180m64-16 8 16" stroke="#347555" stroke-width="7" stroke-linecap="round"/><path d="M57 85q2-23 25-25 12-19 35-6 25-17 42 3 23 1 29 28Z" fill="#fffdf0" stroke="#347555" stroke-width="3"/><path d="M52 84h139q-4 83-70 87-64-3-69-87Z" fill="#ffdc84" stroke="#347555" stroke-width="4"/><path d="M55 100h133" stroke="#f5bd55" stroke-width="5"/><g fill="#2b6348"><ellipse class="zizi-eye" cx="96" cy="121" rx="5" ry="7"/><ellipse class="zizi-eye" cx="148" cy="121" rx="5" ry="7"/></g><ellipse cx="80" cy="134" rx="10" ry="5" fill="#ee9b78" opacity=".75"/><ellipse cx="162" cy="134" rx="10" ry="5" fill="#ee9b78" opacity=".75"/><path d="M110 136q12 12 24-1" stroke="#2b6348" stroke-width="4" stroke-linecap="round" fill="none"/></g><g fill="#eb9578"><path d="m34 48 3-8 4 8 8 2-7 5-1 8-5-6-8-1Z"/><circle cx="203" cy="49" r="4"/></g><g fill="#b3c982"><circle cx="39" cy="155" r="4"/><path d="m205 153 3-6 3 6 6 2-5 4v6l-5-4-6 1 2-6-3-3Z"/></g></svg>`;
}
export function quickFoodChoices(foods,entries) {
 const count=new Map();for(const e of entries)count.set(e.food.id,(count.get(e.food.id)||0)+1);
 const defaults=['demo-egg','demo-soy','demo-rice','demo-banana'];
 return [...foods].sort((a,b)=>(count.get(b.id)||0)-(count.get(a.id)||0)||((defaults.includes(a.id)?defaults.indexOf(a.id):100)-(defaults.includes(b.id)?defaults.indexOf(b.id):100))).slice(0,4);
}
