import { DEMO_FOODS, DEMO_DAY, FOOD_CATEGORIES, MEALS } from './data.js';
import { loadState, persistState, validateState, cleanFood, newState, makeId } from './storage.js';
import { localISODate, moveISODate, lastSevenDays, sumNutrition, scaleNutrition, formatNumber, isISODate } from './math.js';

let state = loadState();
let selectedDate = localISODate();
let activePage = 'today';
let foodCategory = '全部';
let foodQuery = '';
let preferredMeal = 'lunch';
let modal = null;

const root = document.getElementById('app');
const navigation = [
  { id: 'today', label: '我的一天', icon: 'home' },
  { id: 'foods', label: '食物資料庫', icon: 'search' },
  { id: 'insights', label: '營養分析', icon: 'chart' },
  { id: 'settings', label: '設定與備份', icon: 'settings' }
];
const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  chart: '<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1 2.1-2.4 2.4-2.1-.1-1.4 1.6h-3.2L9 19.4l-2.1.1-2.4-2.4.1-2.1L3 13.6v-3.2L4.6 9l-.1-2.1 2.4-2.4L9 4.6 10.4 3h3.2L15 4.6l2.1-.1 2.4 2.4L19.4 9l1.6 1.4v3.2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="m14 18-6-6 6-6"/>',
  next: '<path d="m10 18 6-6-6-6"/>',
  trash: '<path d="M4 7h16M10 3h4M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9M16 4l4 4-11 11-5 1 1-5z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload: '<path d="M12 21V9m-5 5 5-5 5 5M4 7V3h16v4"/>',
  heart: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  leaf: '<path d="M20 4C11 4 4 8 4 16a4 4 0 0 0 4 4C16 20 20 13 20 4Z"/><path d="M4 20c4-7 8-10 13-12"/>'
};
const icon = (name, size = 19) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.info}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const foodList = () => [...DEMO_FOODS, ...state.customFoods];
const entriesOn = date => state.entries.filter(e => e.date === date);
const nutritionOn = date => sumNutrition(entriesOn(date));
const pct = (amount, target) => Math.min(100, Math.max(0, target ? amount / target * 100 : 0));
const dateText = date => new Date(`${date}T12:00:00`).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
const weekDay = date => new Date(`${date}T12:00:00`).toLocaleDateString('zh-TW', { weekday: 'short' });
const safeAttr = esc;

function flash(message) {
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); document.body.append(toast); }
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(flash.timer);
  flash.timer = window.setTimeout(() => toast.classList.remove('show'), 3600);
}
function commit(message) {
  try { persistState(state); render(); if (message) flash(message); }
  catch (error) { flash('無法儲存：瀏覽器儲存空間可能不足。建議先匯出備份。'); console.error(error); }
}
function navMarkup(place = 'side') {
  return navigation.map(n => `<button type="button" class="nav-link ${activePage === n.id ? 'active' : ''}" data-action="nav" data-page="${n.id}" aria-current="${activePage === n.id ? 'page' : 'false'}">${icon(n.icon, 19)}<span>${n.label}</span></button>`).join('');
}
function shell() {
  const pageLabel = navigation.find(n => n.id === activePage)?.label || '我的一天';
  return `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="brand"><div class="brand-icon">${icon('leaf', 24)}</div><div><strong>NutriDay<span> TW</span></strong><small>每天，好好吃飯。</small></div></div>
        <div class="nav-overline">我的健康日記</div>
        <nav class="sidebar-nav" aria-label="主要導覽">${navMarkup()}</nav>
        <div class="side-bottom"><div class="side-illustration">🥑 <span>🥬</span></div><strong>記錄是為了更了解自己</strong><p>不需要完美，只需要一點一點找到適合自己的步調。</p></div>
        <div class="sidebar-foot">© 2026 NutriDay TW · v1.0</div>
      </aside>
      <div class="main-wrap">
        <header class="topbar">
          <div class="topbar-brand"><span class="mobile-mark">🌱</span><span class="breadcrumb">你的飲食日記 <span>/</span> <b>${pageLabel}</b></span></div>
          <div class="date-selector">
            <button type="button" class="date-arrow" data-action="date-prev" aria-label="前一天">${icon('back', 18)}</button>
            <label class="date-picker-label">${icon('calendar', 17)}<input type="date" id="selected-date" value="${selectedDate}" aria-label="紀錄日期" /></label>
            <button type="button" class="date-arrow" data-action="date-next" aria-label="後一天">${icon('next', 18)}</button>
          </div>
        </header>
        <main class="content" id="main-content">${activePage === 'today' ? pageToday() : activePage === 'foods' ? pageFoods() : activePage === 'insights' ? pageInsights() : pageSettings()}</main>
      </div>
    </div>
    <nav class="bottom-nav" aria-label="手機導覽">${navMarkup('bottom')}</nav>
    <div id="modal-layer">${modalMarkup()}</div>
  `;
}
function heading(eyebrow, title, description) {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div></div>`;
}
function progressLine(label, value, total, color, unit = 'g') {
  return `<div class="progress-item"><div class="progress-top"><span>${label}</span><b>${formatNumber(value, 1)} <small>${unit}</small></b></div><div class="progress-track"><span style="width:${pct(value, total)}%;background:${color}"></span></div></div>`;
}
function calorieCard(today) {
  const goal = state.settings.kcalGoal;
  const progress = pct(today.kcal, goal);
  const over = today.kcal > goal;
  return `<div class="calorie-card">
    <div class="hero-deco deco-a"></div><div class="hero-deco deco-b"></div>
    <div class="card-eyebrow">今日已攝取 <span class="calorie-indicator">● 紀錄中</span></div>
    <div class="calorie-main"><strong>${formatNumber(today.kcal)}</strong><span>kcal</span></div>
    <p>個人設定目標 ${formatNumber(goal)} kcal <span class="dot-sep">·</span> ${over ? `高於目標 ${formatNumber(today.kcal - goal)} kcal` : `進度 ${formatNumber(progress)}%`}</p>
    <div class="calorie-track"><div style="width:${progress}%"></div></div>
    <small>每天的需求都可能不同，目標僅供自我觀察。</small>
    <div class="hero-food">🥗</div>
  </div>`;
}
function macrosCard(today) {
  const macroEnergy = today.protein * 4 + today.carbs * 4 + today.fat * 9;
  const pieces = [today.protein * 4, today.carbs * 4, today.fat * 9];
  const deg1 = macroEnergy ? pieces[0] / macroEnergy * 360 : 0;
  const deg2 = macroEnergy ? (pieces[0] + pieces[1]) / macroEnergy * 360 : 0;
  const donut = `conic-gradient(#407e67 0deg ${deg1}deg,#efb27e ${deg1}deg ${deg2}deg,#8ca9d0 ${deg2}deg 360deg)`;
  return `<div class="surface macro-card"><div class="section-subheading"><div><h3>三大營養素</h3><p>蛋白質、碳水與脂肪</p></div><span class="light-tag">今日</span></div>
    <div class="macro-body"><div class="donut" style="background:${macroEnergy ? donut : 'conic-gradient(#edf0eb 0 360deg)'}"><div><strong>${formatNumber(today.protein, 1)}</strong><small>蛋白質 g</small></div></div>
    <div class="macro-legend">
      <div><i style="background:#407e67"></i><span>蛋白質</span><b>${formatNumber(today.protein, 1)} g</b></div>
      <div><i style="background:#efb27e"></i><span>碳水化合物</span><b>${formatNumber(today.carbs, 1)} g</b></div>
      <div><i style="background:#8ca9d0"></i><span>脂肪</span><b>${formatNumber(today.fat, 1)} g</b></div>
    </div></div>
    <div class="protein-foot">${progressLine('蛋白質目標', today.protein, state.settings.proteinGoal, '#407e67')}</div>
    </div>`;
}
function mealCard(meal, dayEntries) {
  const items = dayEntries.filter(e => e.meal === meal.id);
  const total = sumNutrition(items);
  return `<section class="surface meal-card"><div class="meal-head"><div class="meal-icon">${meal.emoji}</div><div><h3>${meal.label}</h3><p>${meal.sub}</p></div><b>${formatNumber(total.kcal)} <small>kcal</small></b></div>
    <div class="meal-entries">${items.length ? items.map(e => {
      const n = scaleNutrition(e.food, e.quantity);
      return `<div class="meal-entry"><div class="meal-entry-icon">${esc(e.food.emoji || '🍽️')}</div><div class="meal-entry-name"><strong>${esc(e.food.name)}</strong><small>${formatNumber(e.quantity, 2)} × ${esc(e.food.serving)}${e.food.source === 'demo' ? ' · 示範估值' : ''}</small></div><span>${formatNumber(n.kcal)} kcal</span><button class="icon-button" data-action="edit-entry" data-id="${safeAttr(e.id)}" aria-label="編輯 ${safeAttr(e.food.name)}">${icon('edit', 15)}</button><button class="icon-button danger-hover" data-action="delete-entry" data-id="${safeAttr(e.id)}" aria-label="刪除 ${safeAttr(e.food.name)}">${icon('trash', 15)}</button></div>`;
    }).join('') : '<div class="meal-empty">這餐還沒有紀錄，今天想吃什麼呢？</div>'}</div>
    <button class="add-meal" data-action="add-meal" data-meal="${meal.id}">${icon('plus', 17)} 加入${meal.label}紀錄</button>
  </section>`;
}
function weeklyMini() {
  const days = lastSevenDays(selectedDate);
  const values = days.map(d => nutritionOn(d).kcal);
  const maxValue = Math.max(state.settings.kcalGoal, ...values, 1);
  return `<section class="surface weekly-card"><div class="section-subheading"><div><h3>近 7 天熱量趨勢</h3><p>看看自己的飲食節奏</p></div><button class="text-link" data-action="nav" data-page="insights">詳細分析 →</button></div>
  <div class="mini-chart" aria-label="7 日熱量長條圖">
  ${days.map((d,i) => `<div class="bar-col" title="${d}：${formatNumber(values[i])} kcal"><div class="bar-area"><div class="bar ${d === selectedDate ? 'current' : ''}" style="height:${values[i] ? Math.max(5, values[i] / maxValue * 100) : 0}%"></div></div><small>${weekDay(d).replace('週','')}</small></div>`).join('')}
  </div><div class="chart-foot"><span><i></i> 每日攝取</span><span>僅統計已記錄餐點</span></div></section>`;
}
function pageToday() {
  const entries = entriesOn(selectedDate);
  const today = sumNutrition(entries);
  return `${heading('YOUR DAILY JOURNAL', '吃得自在，也看得明白。', `${dateText(selectedDate)} · 今天的每一餐，都值得好好記錄。`)}
    <div class="overview-grid">${calorieCard(today)}${macrosCard(today)}</div>
    <div class="section-header"><div><div class="eyebrow">FOOD DIARY</div><h2>今日飲食紀錄 <span class="total-count">${entries.length} 筆</span></h2></div><button class="primary-button" data-action="add-meal" data-meal="lunch">${icon('plus', 18)} 記錄飲食</button></div>
    <div class="content-grid"><div class="meal-grid">${MEALS.map(m => mealCard(m, entries)).join('')}</div>
      <aside class="insight-rail">${weeklyMini()}<div class="tip-card"><div class="tip-icon">💡</div><h3>今天的小提醒</h3><p>${entries.length ? '留意餐點的多樣性，營養不只是一個熱量數字。覺得估算不準時，可以自己調整份量或建立食物。' : '還沒有飲食紀錄嗎？可以試著記下下一餐，也能先載入示範資料體驗。'}</p><button class="soft-button" data-action="demo">${icon('plus', 16)} ${entries.length ? '再加入示範餐點' : '載入一日示範紀錄'}</button></div>
      <div class="source-note">${icon('info', 17)}<p>內建食物為<b>示範估值</b>，不代表官方營養標示；烹調、份量與品牌都會影響實際數值。</p></div></aside></div>`;
}
function filteredFoods() {
  return foodList().filter(f => (foodCategory === '全部' || f.category === foodCategory) && (`${f.name} ${f.category}`.toLowerCase().includes(foodQuery.trim().toLowerCase())));
}
function foodTiles() {
  const foods = filteredFoods();
  return foods.length ? foods.map(f => `<article class="food-tile"><div class="food-emoji">${esc(f.emoji)}</div><div class="food-info"><div class="food-title">${esc(f.name)} <span class="food-source ${f.source === 'custom' ? 'is-custom' : ''}">${f.source === 'custom' ? '我的食物' : '示範估值'}</span></div><p>${esc(f.serving)}</p><div class="food-macros">蛋白質 ${formatNumber(f.protein, 1)}g　·　碳水 ${formatNumber(f.carbs, 1)}g　·　脂肪 ${formatNumber(f.fat, 1)}g</div></div><div class="food-cal"><strong>${formatNumber(f.kcal)}</strong><small>kcal / 份</small></div><div class="food-actions"><button class="circle-add" data-action="choose-food" data-id="${safeAttr(f.id)}" aria-label="加入 ${safeAttr(f.name)}">${icon('plus', 20)}</button>${f.source === 'custom' ? `<button class="circle-remove" data-action="delete-custom" data-id="${safeAttr(f.id)}" aria-label="刪除自訂食物 ${safeAttr(f.name)}">${icon('trash', 16)}</button>` : ''}</div></article>`).join('') : '<div class="no-results"><span>🔍</span><h3>還找不到這個食物</h3><p>換個關鍵字，或自己建立一筆營養資料吧。</p><button class="primary-button" data-action="custom-food">新增我的食物</button></div>';
}
function pageFoods() {
  return `${heading('FOOD LIBRARY', '今天想吃些什麼？', '搜尋常見食物、調整份量，再加入你的飲食日記。')}
    <div class="foods-toolbar"><label class="search-box">${icon('search', 20)}<input id="food-search" type="search" placeholder="搜尋飯、蛋、豆漿、便當、手搖飲…" value="${safeAttr(foodQuery)}" autocomplete="off" /><span>⌘ F</span></label><button class="primary-button" data-action="custom-food">${icon('plus', 18)} 新增我的食物</button></div>
    <div class="category-scroll" role="group" aria-label="食物分類">${FOOD_CATEGORIES.map(c => `<button class="category-pill ${c === foodCategory ? 'selected' : ''}" data-action="category" data-category="${safeAttr(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="library-info">${icon('info', 17)} <span>這是<b>功能演示用估值資料庫</b>，不是經過逐筆查核的官方成分表。可用自訂食物輸入包裝標示。</span></div>
    <div class="food-count">找到 ${filteredFoods().length} 種食物 <span>（按 ＋ 加入 ${MEALS.find(m => m.id === preferredMeal)?.label || '午餐'}）</span></div>
    <div id="food-results" class="foods-grid">${foodTiles()}</div>`;
}
function pageInsights() {
  const days = lastSevenDays(selectedDate);
  const values = days.map(d => nutritionOn(d));
  const used = days.filter(d => entriesOn(d).length);
  const total = sumNutrition(state.entries.filter(e => days.includes(e.date)));
  const avg = used.length ? total.kcal / used.length : 0;
  const max = Math.max(state.settings.kcalGoal, ...values.map(v => v.kcal), 1);
  const macroTotal = total.protein * 4 + total.carbs * 4 + total.fat * 9;
  const proteinShare = macroTotal ? (total.protein * 4 / macroTotal * 100) : 0;
  const carbShare = macroTotal ? (total.carbs * 4 / macroTotal * 100) : 0;
  const fatShare = macroTotal ? (total.fat * 9 / macroTotal * 100) : 0;
  return `${heading('WEEKLY INSIGHTS', '把每一天，連成自己的節奏。', `${days[0].replaceAll('-','/')} — ${days[6].replaceAll('-','/')} · 選擇上方日期可查看不同的 7 天區間。`)}
    <div class="insight-summary"><div class="summary-stat"><span>有紀錄的天數</span><strong>${used.length}<small> / 7 天</small></strong><p>按自己的步調前進</p></div><div class="summary-stat"><span>記錄日平均熱量</span><strong>${formatNumber(avg)}<small> kcal</small></strong><p>僅平均有紀錄的日期</p></div><div class="summary-stat"><span>總蛋白質攝取</span><strong>${formatNumber(total.protein, 1)}<small> g</small></strong><p>近 7 天已記錄合計</p></div></div>
    <div class="insight-panels"><section class="surface chart-panel"><div class="section-subheading"><div><h3>每日熱量攝取</h3><p>估算值，未記錄不代表沒有攝取</p></div><span class="light-tag">7 DAYS</span></div><div class="large-chart">
      <div class="goal-line" style="bottom:${Math.min(97, Math.round(state.settings.kcalGoal/max*100))}%"><span>目標 ${formatNumber(state.settings.kcalGoal)}</span></div>
      ${days.map((d,i) => `<div class="large-bar-col"><div class="bar-value">${values[i].kcal ? formatNumber(values[i].kcal) : '—'}</div><div class="large-bar-area"><div class="large-bar ${d === selectedDate ? 'selected' : ''}" style="height:${values[i].kcal ? Math.max(3, values[i].kcal / max * 100) : 0}%"></div></div><div class="bar-label">${weekDay(d).replace('週','')}<small>${Number(d.slice(-2))}日</small></div></div>`).join('')}
      </div><div class="chart-caption">虛線為你自行設定的目標，不是臨床營養建議。</div></section>
      <section class="surface ratio-panel"><div class="section-subheading"><div><h3>近 7 天營養結構</h3><p>依三大營養素換算熱量占比</p></div></div><div class="macro-meter"><span style="width:${proteinShare}%;background:#407e67"></span><span style="width:${carbShare}%;background:#efb27e"></span><span style="width:${fatShare}%;background:#8ca9d0"></span></div><div class="share-rows"><div><i style="background:#407e67"></i>蛋白質 <strong>${formatNumber(proteinShare, 1)}%</strong><small>${formatNumber(total.protein, 1)} g</small></div><div><i style="background:#efb27e"></i>碳水化合物 <strong>${formatNumber(carbShare, 1)}%</strong><small>${formatNumber(total.carbs, 1)} g</small></div><div><i style="background:#8ca9d0"></i>脂肪 <strong>${formatNumber(fatShare, 1)}%</strong><small>${formatNumber(total.fat, 1)} g</small></div></div><div class="chart-caption">換算採蛋白質及碳水每克約 4 kcal、脂肪每克約 9 kcal；與食物熱量標示可能因四捨五入等因素不同。</div></section></div>
    <div class="download-panel"><div class="download-icon">${icon('download', 24)}</div><div><h3>想留下自己的飲食分析嗎？</h3><p>你可以匯出所有飲食紀錄為 CSV，繼續用 Excel 或 Google 試算表分析。</p></div><button class="outline-button" data-action="export-csv">下載 CSV</button></div>`;
}
function pageSettings() {
  return `${heading('PREFERENCES & PRIVACY', '打造適合自己的紀錄方式。', '數字是參考工具，不是需要每天達成的考試。')}
    <div class="settings-stack"><section class="surface settings-panel"><div class="settings-panel-head"><div class="setting-mark green">🎯</div><div><h3>自訂參考目標</h3><p>依照你自己的需求設定，不由程式自動判斷每日熱量。</p></div></div><form id="goals-form" class="settings-form"><label>每日熱量參考值 <small>kcal</small><input name="kcalGoal" type="number" min="500" max="10000" step="50" required value="${state.settings.kcalGoal}" /></label><label>每日蛋白質參考值 <small>g</small><input name="proteinGoal" type="number" min="1" max="1000" step="1" required value="${state.settings.proteinGoal}" /></label><button class="primary-button" type="submit">${icon('check', 17)} 儲存設定</button></form><p class="form-hint">這些數值是自行設定的追蹤參考，不代表個人熱量需求或醫療建議。未成年人、懷孕、慢性疾病或有飲食困擾者，建議尋求專業評估。</p></section>
    <section class="surface settings-panel"><div class="settings-panel-head"><div class="setting-mark peach">${icon('shield', 23)}</div><div><h3>本機資料與備份</h3><p>目前共有 ${state.entries.length} 筆飲食紀錄、${state.customFoods.length} 筆自訂食物。</p></div></div><div class="setting-actions"><button class="outline-button" data-action="export-json">${icon('download', 17)} 匯出完整 JSON</button><button class="outline-button" data-action="export-csv">${icon('download', 17)} 匯出餐點 CSV</button><label class="outline-button import-label">${icon('upload', 17)} 匯入 JSON（覆蓋）<input type="file" id="import-json" accept="application/json,.json" hidden /></label></div><p class="form-hint">資料儲存在此瀏覽器的 localStorage，不會自動同步。清除瀏覽資料或更換手機可能造成紀錄遺失，請定期匯出 JSON。匯入會取代此裝置現有資料。</p><div class="danger-zone"><div><b>清除所有本機紀錄</b><p>這個動作無法復原，建議先備份。</p></div><button class="danger-button" data-action="clear-all">清除全部資料</button></div></section>
    <section class="disclaimer-panel"><div>${icon('info', 20)}</div><p><strong>關於營養資料</strong>：內建食品資料只為展示功能而建立，屬近似估值，不適合直接作為醫療或精確飲食處方。營養數據依食材、品牌、烹調與份量而異。日後可整合台灣食藥署食品營養成分資料集與產品營養標示，並保留來源、版本及份量單位。</p></section></div>`;
}
function modalMarkup() {
  if (!modal) return '';
  if (modal.type === 'entry') {
    const food = modal.food;
    const quantity = modal.quantity ?? 1;
    const n = scaleNutrition(food, quantity);
    return `<div class="modal-backdrop" data-action="close-overlay"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-top"><div class="eyebrow">FOOD RECORD</div><button class="icon-button" data-action="close-modal" aria-label="關閉">${icon('close', 20)}</button></div><div class="modal-food-hero"><div class="modal-food-icon">${esc(food.emoji)}</div><div><h2 id="modal-title">${esc(food.name)}</h2><p>${esc(food.serving)} / 1 份 · ${food.source === 'demo' ? '示範估值' : '自訂資料'}</p></div></div><form id="entry-form"><label class="form-label">記錄到哪一餐？<select name="meal">${MEALS.map(m => `<option value="${m.id}" ${m.id === modal.meal ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label><label class="form-label">份數（可輸入 0.5、1.5）<input type="number" name="quantity" value="${quantity}" min="0.1" max="100" step="0.1" required /></label><div class="preview-nutrients"><strong>這次預計記錄</strong><div><b id="preview-kcal">${formatNumber(n.kcal)} kcal</b><span id="preview-macro">蛋白質 ${formatNumber(n.protein, 1)}g　碳水 ${formatNumber(n.carbs, 1)}g　脂肪 ${formatNumber(n.fat, 1)}g</span></div></div><button type="submit" class="primary-button full">${icon('check', 18)} ${modal.editId ? '儲存修改' : '加入飲食日記'}</button></form></div></div>`;
  }
  if (modal.type === 'custom') return `<div class="modal-backdrop" data-action="close-overlay"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-top"><div class="eyebrow">MY OWN FOOD</div><button class="icon-button" data-action="close-modal" aria-label="關閉">${icon('close', 20)}</button></div><h2 id="modal-title">新增我的食物</h2><p class="modal-desc">照著食品包裝營養標示填寫，或輸入你自己的估算值。</p><form id="custom-form" class="custom-form"><label class="form-label">食物名稱<input name="name" maxlength="80" placeholder="例如：我常喝的無糖豆漿" required /></label><label class="form-label">每份大小<input name="serving" maxlength="50" placeholder="例如：1 瓶（375 mL）" required /></label><div class="form-grid"><label class="form-label">熱量 (kcal)<input name="kcal" type="number" min="0" max="10000" step="0.1" required /></label><label class="form-label">蛋白質 (g)<input name="protein" type="number" min="0" max="1000" step="0.1" required /></label><label class="form-label">碳水 (g)<input name="carbs" type="number" min="0" max="1000" step="0.1" required /></label><label class="form-label">脂肪 (g)<input name="fat" type="number" min="0" max="1000" step="0.1" required /></label></div><button type="submit" class="primary-button full">${icon('check', 18)} 儲存到我的食物庫</button></form></div></div>`;
  return '';
}
function render() {
  root.innerHTML = shell();
  document.title = `${navigation.find(n => n.id === activePage)?.label}｜NutriDay TW`;
  document.body.classList.toggle('has-modal', Boolean(modal));
  if (modal) root.querySelector('.modal-card input, .modal-card select')?.focus();
}
function openEntry(food, entry = null) {
  modal = { type: 'entry', food, quantity: entry?.quantity || 1, meal: entry?.meal || preferredMeal, editId: entry?.id || null, date: entry?.date || selectedDate };
  render();
}
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCsv() {
  const quote = v => `"${String(v ?? '').replaceAll('"','""')}"`;
  const rows = [ ['日期','餐別','食物','份量','每份單位','熱量(kcal)','蛋白質(g)','碳水化合物(g)','脂肪(g)','資料來源'] ];
  for (const e of [...state.entries].sort((a,b) => a.date.localeCompare(b.date))) {
    const n = scaleNutrition(e.food, e.quantity);
    rows.push([e.date, MEALS.find(m=>m.id === e.meal)?.label || e.meal, e.food.name, e.quantity, e.food.serving,
      ...['kcal','protein','carbs','fat'].map(k => Math.round(n[k] * 10) / 10), e.food.source === 'demo' ? '示範估值' : '自訂']);
  }
  download(`NutriDay_飲食紀錄_${localISODate()}.csv`, '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}
function handleAction(action, button) {
  switch (action) {
    case 'nav': activePage = button.dataset.page; modal = null; render(); window.scrollTo(0,0); break;
    case 'date-prev': selectedDate = moveISODate(selectedDate, -1); render(); break;
    case 'date-next': selectedDate = moveISODate(selectedDate, 1); render(); break;
    case 'add-meal': preferredMeal = button.dataset.meal; activePage = 'foods'; foodCategory = '全部'; foodQuery = ''; render(); window.scrollTo(0, 0); break;
    case 'category': foodCategory = button.dataset.category; render(); break;
    case 'choose-food': { const food = foodList().find(f => f.id === button.dataset.id); if (food) openEntry(food); break; }
    case 'edit-entry': { const e = state.entries.find(r => r.id === button.dataset.id); if (e) openEntry(e.food, e); break; }
    case 'delete-entry': if (confirm('確定要刪除這筆飲食紀錄嗎？')) { state.entries = state.entries.filter(e => e.id !== button.dataset.id); commit('已刪除紀錄'); } break;
    case 'delete-custom': if (confirm('確定刪除這項自訂食物嗎？已記錄的餐點會保留。')) { state.customFoods = state.customFoods.filter(f => f.id !== button.dataset.id); commit('已移除自訂食物'); } break;
    case 'custom-food': modal = { type: 'custom' }; render(); break;
    case 'close-modal': modal = null; render(); break;
    case 'demo': {
      if (!confirm(`將新增 10 筆「示範估值」飲食紀錄到 ${selectedDate}。既有紀錄不會被刪除。繼續嗎？`)) break;
      for (const [key, meal, quantity] of DEMO_DAY) {
        const food = DEMO_FOODS.find(f => f.id === `demo-${key}`);
        if (food) state.entries.push({ id: makeId(), date: selectedDate, meal, quantity, food: { ...food }, createdAt: new Date().toISOString() });
      }
      commit('已新增示範紀錄，隨時可以刪除'); break;
    }
    case 'export-json': download(`NutriDay_完整備份_${localISODate()}.json`, JSON.stringify(state, null, 2), 'application/json'); flash('已產生完整資料備份'); break;
    case 'export-csv': exportCsv(); flash('已產生 CSV 檔案'); break;
    case 'clear-all': if (confirm('確定永久清除所有本機飲食紀錄、自訂食物和設定嗎？此操作無法復原。')) { state = newState(); commit('已清除本機資料'); } break;
    default: break;
  }
}
root.addEventListener('click', e => {
  if (e.target.closest('[data-action="close-overlay"]') === e.target) { modal = null; render(); return; }
  const button = e.target.closest('[data-action]');
  if (button) handleAction(button.dataset.action, button);
});
root.addEventListener('change', async e => {
  if (e.target.id === 'selected-date') { if (isISODate(e.target.value)) { selectedDate = e.target.value; render(); } }
  if (e.target.id === 'import-json') {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('檔案超過 15 MB。');
      const incoming = validateState(JSON.parse(await file.text()));
      if (confirm(`已驗證備份：${incoming.entries.length} 筆紀錄。匯入後將覆蓋此瀏覽器的現有資料，確定繼續嗎？`)) {
        persistState(incoming); state = incoming; render(); flash('已成功匯入備份');
      }
    } catch (error) { alert(`無法匯入：${error.message}`); }
    e.target.value = '';
  }
});
root.addEventListener('input', e => {
  if (e.target.id === 'food-search') {
    foodQuery = e.target.value;
    const results = root.querySelector('#food-results');
    if (results) results.innerHTML = foodTiles();
    const count = root.querySelector('.food-count');
    if (count) count.innerHTML = `找到 ${filteredFoods().length} 種食物 <span>（按 ＋ 加入 ${MEALS.find(m => m.id === preferredMeal)?.label || '午餐'}）</span>`;
  }
  if (e.target.name === 'quantity' && modal?.type === 'entry') {
    const quantity = Number(e.target.value);
    if (Number.isFinite(quantity) && quantity > 0 && quantity <= 100) {
      modal.quantity = quantity;
      const n = scaleNutrition(modal.food, quantity);
      root.querySelector('#preview-kcal').textContent = `${formatNumber(n.kcal)} kcal`;
      root.querySelector('#preview-macro').textContent = `蛋白質 ${formatNumber(n.protein, 1)}g　碳水 ${formatNumber(n.carbs, 1)}g　脂肪 ${formatNumber(n.fat, 1)}g`;
    }
  }
});
root.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'entry-form') {
    const f = new FormData(e.target);
    const quantity = Number(f.get('quantity'));
    const meal = f.get('meal');
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100 || !MEALS.some(m => m.id === meal)) { flash('請輸入正確份數與餐別'); return; }
    if (modal.editId) {
      state.entries = state.entries.map(en => en.id === modal.editId ? { ...en, food: { ...modal.food }, meal, quantity } : en);
    } else {
      state.entries.push({ id: makeId(), date: modal.date, meal, quantity, food: { ...modal.food }, createdAt: new Date().toISOString() });
    }
    selectedDate = modal.date; modal = null; activePage = 'today'; commit('已儲存這餐的飲食紀錄'); window.scrollTo(0,0);
  }
  if (e.target.id === 'custom-form') {
    const data = Object.fromEntries(new FormData(e.target));
    const food = cleanFood({ ...data, id: makeId() }, true);
    if (!food) { flash('請檢查食物名稱、份量與營養數值'); return; }
    state.customFoods.push(food); modal = null; foodCategory = '自訂'; activePage = 'foods'; foodQuery = ''; commit('已新增至我的食物庫');
  }
  if (e.target.id === 'goals-form') {
    const form = new FormData(e.target);
    const kcalGoal = Number(form.get('kcalGoal')); const proteinGoal = Number(form.get('proteinGoal'));
    if (kcalGoal < 500 || kcalGoal > 10000 || proteinGoal < 1 || proteinGoal > 1000) { flash('目標數值超出允許範圍'); return; }
    state.settings = { kcalGoal, proteinGoal }; commit('參考目標已更新');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal) { modal = null; render(); } });
render();
