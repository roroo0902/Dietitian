import { SheetConnection, saveCloudConfig, stateFingerprint } from './cloud.js';
import { validateState, persistState } from './storage.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const cloud = new SheetConnection();
let callbacks,ready=false,timer,dirty=false,operation=false;
const restoreKey='yingyangzi-restore-point';
function updateLabels() {
 document.querySelectorAll('[data-cloud-status]').forEach(el=>{el.textContent=cloud.detail;el.dataset.status=cloud.status;});
 document.querySelectorAll('[data-cloud-last]').forEach(el=>{el.textContent=cloud.lastSaved?`最近儲存：${new Date(cloud.lastSaved).toLocaleString('zh-TW')}`:'尚未完成雲端同步';});
}
export function queueCloudSave() {
 dirty=true;clearTimeout(timer);if(!ready||!cloud.connected)return;
 timer=setTimeout(async()=>{
  if(cloud.busy||operation){queueCloudSave();return;}
  dirty=false;
  try {await cloud.push(structuredClone(callbacks.getState()));}catch {ready=false;}
  if(dirty&&ready)queueCloudSave();
 },1200);
}
export function cloudBadge() {return `<button type="button" class="cloud-badge" data-action="nav" data-page="settings"><span class="status-dot" aria-hidden="true"></span><span data-cloud-status>${esc(cloud.detail)}</span></button>`;}
export function cloudPanel() {
 const c=cloud.config;
 return `<section class="surface settings-panel cloud-panel"><div class="settings-panel-head"><div class="setting-mark mint">☁</div><div><h3>我的 Google Sheet 資料庫</h3><p>私人雲端空間，登入後才可讀寫。</p></div><span class="personal-tag">個人版</span></div>
 <div class="connection-status" role="status"><span class="status-dot"></span><b data-cloud-status>${esc(cloud.detail)}</b><small data-cloud-last>${cloud.lastSaved?'最近儲存：'+new Date(cloud.lastSaved).toLocaleString('zh-TW'):'尚未完成雲端同步'}</small></div>
 <div class="setting-actions"><button type="button" class="primary-button" data-cloud-action="connect">登入 Google</button><button type="button" class="outline-button" data-cloud-action="pull">採用雲端資料</button><button type="button" class="outline-button" data-cloud-action="push">以本機覆蓋雲端</button><button type="button" class="outline-button" data-cloud-action="disconnect">中斷連線</button><a class="outline-button" href="https://docs.google.com/spreadsheets/d/${esc(c.sheetId)}/edit" target="_blank" rel="noopener noreferrer">開啟私人試算表 ↗</a></div>
 <p class="form-hint">初次連線請確認資料方向。完成後，新增、編輯與刪除會自動保存；授權到期、離線或發現雲端變動時會暫停同步，紀錄仍保留在本機。請避免多個裝置同時編輯。</p>
 <details class="cloud-setup" ${c.clientId?'':'open'}><summary>第一次設定 Google 登入</summary><p>先依照<a href="GOOGLE_SETUP.html" target="_blank" rel="noopener">圖文設定指南 ↗</a>取得 Client ID，再填入下方。這不是密碼，不需要填 Client Secret。</p><form id="cloud-config-form" class="settings-form"><label>Google OAuth Client ID<input name="clientId" value="${esc(c.clientId)}" placeholder="…apps.googleusercontent.com" required autocomplete="off" /></label><label>Google 試算表網址或 ID<input name="sheetId" value="${esc(c.sheetId)}" required autocomplete="off" /></label><button class="primary-button" type="submit">儲存連線設定</button></form></details>
 <button type="button" class="text-link" data-cloud-action="restore">還原同步前的本機復原點</button></section>`;
}
export function initCloudUI(options) {
 callbacks=options;window.addEventListener('cloudchange',updateLabels);
 window.addEventListener('offline',()=>cloud.notify('offline','目前離線，紀錄先保存在本機'));
 window.addEventListener('storage',e=>{if(e.key==='nutriday-tw-v1'){ready=false;clearTimeout(timer);cloud.notify('error','其他分頁已更新紀錄，請重新整理後再同步');}});
 document.addEventListener('submit',e=>{
  if(e.target.id!=='cloud-config-form')return;e.preventDefault();
  if(operation||cloud.busy){callbacks.flash('同步中，請稍後再修改設定');return;}
  try {const data=new FormData(e.target);const config=saveCloudConfig(String(data.get('clientId')),String(data.get('sheetId')));ready=false;clearTimeout(timer);cloud.disconnect();cloud.config=config;callbacks.render();callbacks.flash('已儲存設定，接著點「登入 Google」');}catch(error){callbacks.flash(error.message);}
 });
 document.addEventListener('click',async e=>{
  const action=e.target.closest('[data-cloud-action]')?.dataset.cloudAction;if(!action)return;
  if(operation||cloud.busy){callbacks.flash('同步正在進行，請稍候');return;}
  if(action==='disconnect'){ready=false;clearTimeout(timer);cloud.disconnect();callbacks.render();return;}
  if(action==='restore') {
   try {const p=JSON.parse(localStorage.getItem(restoreKey)||'null');if(!p){callbacks.flash('目前沒有復原點');return;}
    if(!confirm(`將還原 ${new Date(p.savedAt).toLocaleString('zh-TW')} 的本機資料，並暫停雲端同步。繼續嗎？`))return;
    const restored=validateState(p.state);persistState(restored);callbacks.setState(restored);ready=false;clearTimeout(timer);callbacks.render();callbacks.flash('已還原本機紀錄，請重新確認同步方向');
   }catch(error){callbacks.flash(error.message);}return;
  }
  operation=true;const wasReady=ready;ready=false;clearTimeout(timer);
  try {
   if(action==='connect') {
    await cloud.authorize();const remote=await cloud.pull();
    if(stateFingerprint(remote)===stateFingerprint(callbacks.getState())){ready=true;cloud.notify('saved','資料一致，已啟用自動儲存');}
    else cloud.notify('choice','已登入，請選擇採用雲端或以本機覆蓋');
   }
   if(action==='pull') {
    if(!confirm('採用 Google Sheet 的全部紀錄、自訂食物與目標設定，取代本機資料？本機資料會先保存為復原點。')){ready=wasReady;return;}
    const before=stateFingerprint(callbacks.getState());saveRestore();const remote=await cloud.pull();if(before!==stateFingerprint(callbacks.getState()))throw Error('讀取期間本機有新修改，已取消還原。請重新選擇同步方向。');persistState(remote);callbacks.setState(remote);ready=true;cloud.notify('saved','已採用雲端，已啟用自動儲存');callbacks.flash('已讀取你的私人 Google Sheet');
   }
   if(action==='push') {
    if(!confirm('將本機全部紀錄、自訂食物與目標設定覆蓋至 Google Sheet？若其他裝置有新紀錄，請先採用雲端。')){ready=wasReady;return;}
    saveRestore();await cloud.push(structuredClone(callbacks.getState()),{overwrite:true});ready=true;callbacks.flash('已儲存至私人 Google Sheet');
   }
  }catch(error){callbacks.flash(error.message);}finally{operation=false;callbacks.render();if(dirty&&ready)queueCloudSave();}
 });
}
function saveRestore(){localStorage.setItem(restoreKey,JSON.stringify({savedAt:new Date().toISOString(),state:callbacks.getState()}));}
