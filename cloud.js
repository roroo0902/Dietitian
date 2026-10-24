import { validateState, makeId } from './storage.js';

export const DEFAULT_SHEET = '199Smq3xlZitPUE4mlQQYVpoZIPnn4NZLBCjjvZMYppw';
export const ENTRY_HEADERS = ['紀錄ID','日期','餐別','食物ID','食物名稱','每份單位','份數','每份熱量(kcal)','每份蛋白質(g)','每份碳水(g)','每份脂肪(g)','圖示','來源','建立時間','食物分類'];
export const FOOD_HEADERS = ['食物ID','食物名稱','食物分類','每份單位','熱量(kcal)','蛋白質(g)','碳水(g)','脂肪(g)','圖示','來源'];
const CONFIG_KEY = 'yingyangzi-cloud-config-v2';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const API = 'https://sheets.googleapis.com/v4/spreadsheets/';
export const stateFingerprint = state => JSON.stringify(validateState(state));
export function sheetIdFrom(value) {
 const id = String(value||'').trim().match(/\/spreadsheets\/d\/([\w-]+)/)?.[1] || String(value||'').trim();
 if(!/^[\w-]{20,150}$/.test(id)) throw Error('請填入正確的 Google 試算表網址或 ID。');
 return id;
}
export function loadCloudConfig() {
 try {const v=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');return {clientId:typeof v.clientId==='string'?v.clientId:'',sheetId:sheetIdFrom(v.sheetId||DEFAULT_SHEET)};}
 catch {return {clientId:'',sheetId:DEFAULT_SHEET};}
}
export function saveCloudConfig(clientId,sheetId) {
 clientId=clientId.trim(); if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw Error('Client ID 應以 .apps.googleusercontent.com 結尾。');
 const config={clientId,sheetId:sheetIdFrom(sheetId)};localStorage.setItem(CONFIG_KEY,JSON.stringify(config));return config;
}
export function stateToRows(value) {
 const state=validateState(value);
 return {
  entries:[ENTRY_HEADERS,...state.entries.map(e=>[e.id,e.date,e.meal,e.food.id,e.food.name,e.food.serving,e.quantity,e.food.kcal,e.food.protein,e.food.carbs,e.food.fat,e.food.emoji,e.food.source,e.createdAt,e.food.category])],
  foods:[FOOD_HEADERS,...state.customFoods.map(f=>[f.id,f.name,f.category,f.serving,f.kcal,f.protein,f.carbs,f.fat,f.emoji,f.source])]
 };
}
function checkHeader(rows,expected,name) {
 if(JSON.stringify(rows[0])!==JSON.stringify(expected)) throw Error(`「${name}」欄位不符合資料庫格式。請使用營養茲建立的試算表，不要改動欄位名稱。`);
}
export function rowsToState(entries,foods,settings) {
 checkHeader(entries,ENTRY_HEADERS,'飲食紀錄');checkHeader(foods,FOOD_HEADERS,'自訂食物');
 checkHeader(settings,['設定鍵','設定值','說明'],'設定');
 const config=Object.fromEntries(settings.slice(1).map(r=>[r[0],r[1]]));
 if(Number(config.schemaVersion)!==1)throw Error('試算表版本不相容。');
 const nonempty=rows=>rows.slice(1).filter(r=>r.some(v=>v!==''&&v!=null));
 const required=(rows,columns)=>{for(const r of nonempty(rows))if(columns.some(i=>r[i]===''||r[i]==null))throw Error('試算表有缺少必要欄位的資料列，請先修正；沒有覆寫任何資料。');};
 required(entries,[0,1,2,3,4,5,6,7,8,9,10,12,13]);required(foods,[0,1,2,3,4,5,6,7,9]);
 return validateState({version:1,settings:{kcalGoal:Number(config.kcalGoal),proteinGoal:Number(config.proteinGoal)},
  entries:nonempty(entries).map(r=>({id:r[0],date:r[1],meal:r[2],food:{id:r[3],name:r[4],serving:r[5],kcal:r[7],protein:r[8],carbs:r[9],fat:r[10],emoji:r[11],source:r[12],category:r[14]||'自訂'},quantity:r[6],createdAt:r[13]})),
  customFoods:nonempty(foods).map(r=>({id:r[0],name:r[1],category:r[2],serving:r[3],kcal:r[4],protein:r[5],carbs:r[6],fat:r[7],emoji:r[8],source:r[9]}))});
}

export class SheetConnection {
 constructor(fetcher=globalThis.fetch.bind(globalThis)) {this.fetcher=fetcher;this.token='';this.expires=0;this.base=null;this.status='offline';this.detail='本機模式';this.lastSaved='';this.busy=false;this.generation=0;this.config=loadCloudConfig();}
 notify(status,detail) {this.status=status;this.detail=detail;globalThis.dispatchEvent?.(new Event('cloudchange'));}
 get connected() {return Boolean(this.token&&Date.now()<this.expires);}
 async authorize() {
  if(!this.config.clientId)throw Error('請先在設定中填入 Google OAuth Client ID。');
  if(!globalThis.google?.accounts?.oauth2)throw Error('Google 登入元件尚未載入，請確認網路後再試。若在 App 內無法登入，請用 Chrome 開啟網站。');
  const generation=this.generation;
  return new Promise((resolve,reject)=>{
   const client=google.accounts.oauth2.initTokenClient({client_id:this.config.clientId,scope:SCOPE,include_granted_scopes:false,
    callback:r=>{if(generation!==this.generation)return reject(Error('連線設定已變更，請重新登入。'));if(r.error)return reject(Error('Google 授權未完成：'+r.error));if(!google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE))return reject(Error('需要允許 Google Sheets 存取才能同步。'));this.token=r.access_token;const ttl=Math.max(1,Number(r.expires_in)-30)*1000;this.expires=Date.now()+ttl;clearTimeout(this.expireTimer);this.expireTimer=setTimeout(()=>this.disconnect(),ttl);this.base=null;this.notify('connected','已登入，請確認同步方向');resolve();},
    error_callback:()=>reject(Error('登入視窗未完成，請允許彈出視窗後重試。'))});
   client.requestAccessToken({prompt:'select_account'});
  });
 }
 disconnect() {this.generation++;clearTimeout(this.expireTimer);this.token='';this.expires=0;this.base=null;this.notify('offline','連線已中斷；請重新登入，本機紀錄保留');}
 async request(suffix,options={}) {
  if(!this.connected){this.notify('offline','請重新登入 Google；紀錄仍在本機');throw Error('Google 授權已到期或尚未登入。');}
  const response=await this.fetcher(API+this.config.sheetId+suffix,{...options,headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json',...options.headers}});
  const body=await response.json();
  if(!response.ok) {
   if(response.status===401){this.disconnect();throw Error('Google 授權已到期，請重新登入。');}
   if(response.status===403)throw Error('Google 拒絕存取。請確認登入的帳號有這份表的編輯權限，且 Google Cloud 已啟用 Sheets API。');
   if(response.status===404)throw Error('找不到這份試算表，請檢查試算表網址與登入帳號。');
   throw Error(body.error?.message||'Google Sheets 請求失敗，請稍後再試。');
  }
  return body;
 }
 async read() {
  const metadata=await this.request('?fields=sheets(properties(sheetId,title,gridProperties))');
  const tabs={}; for(const s of metadata.sheets)tabs[s.properties.title]=s.properties;
  const names=['飲食紀錄','自訂食物','設定'];
  if(names.some(n=>!tabs[n]))throw Error('試算表缺少必要分頁，請使用營養茲個人資料庫。');
  const ranges=names.map((n,i)=>`'${n}'!A1:${['O','J','C'][i]}${Math.min(tabs[n].gridProperties.rowCount,[20002,1002,6][i])}`);
  const body=await this.request('/values:batchGet?'+ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE');
  const rows=body.valueRanges.map(r=>r.values||[]);
  const state=rowsToState(...rows);const fingerprint=JSON.stringify(rows);
  return {state,fingerprint,rows,tabs};
 }
 async pull() {
  if(this.busy)throw Error('同步正在進行，請稍候。');this.busy=true;this.notify('saving','讀取雲端資料中…');
  try {const result=await this.read();this.base=result.fingerprint;this.notify('connected','已讀取雲端資料');return result.state;}
  catch(error){this.notify('error',error.message);throw error;}finally{this.busy=false;}
 }
 async push(value,{overwrite=false}={}) {
  if(this.busy)throw Error('同步正在進行，請稍候。');this.busy=true;this.notify('saving','正在儲存到 Google Sheet…');
  const generation=this.generation;
  try {
   const remote=await this.read();
   if(!overwrite&&(this.base===null||this.base!==remote.fingerprint))throw Error('雲端有另一份資料，已暫停自動同步。請先選擇「採用雲端」或「以本機覆蓋」。');
   if(generation!==this.generation)throw Error('連線已變更，這次同步已取消。');
   const state=validateState(value),data=stateToRows(state),now=new Date().toISOString();
   const settings=[['設定鍵','設定值','說明'],['kcalGoal',state.settings.kcalGoal,'每日熱量參考（kcal）'],['proteinGoal',state.settings.proteinGoal,'每日蛋白質參考（g）'],['schemaVersion',1,'資料格式版本'],['updatedAt',now,'最後一次雲端儲存時間'],['revision',makeId(),'同步版本識別']];
   const datasets=[data.entries,data.foods,settings],names=['飲食紀錄','自訂食物','設定'],requests=[];
   datasets.forEach((rows,i)=>{
    const tab=remote.tabs[names[i]],width=rows[0].length,height=Math.max(rows.length,remote.rows[i].length);
    if(tab.gridProperties.rowCount<height)requests.push({appendDimension:{sheetId:tab.sheetId,dimension:'ROWS',length:height-tab.gridProperties.rowCount}});
    const allRows=Array.from({length:height},(_,ri)=>({values:Array.from({length:width},(_,ci)=>{
     const v=rows[ri]?.[ci];return v==null||v===''?{}:{userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v)}};
    })}));
    requests.push({updateCells:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:height,startColumnIndex:0,endColumnIndex:width},rows:allRows,fields:'userEnteredValue'}});
   });
   await this.request(':batchUpdate',{method:'POST',body:JSON.stringify({requests})});
   // Read back exactly what was stored; failed verification never shows success.
   const check=await this.read();if(stateFingerprint(check.state)!==stateFingerprint(state))throw Error('雲端資料與本機不一致，請重新讀取後確認。');
   this.base=check.fingerprint;this.lastSaved=now;this.notify('saved','已儲存至 Google Sheet');return true;
  } catch(error){this.notify('error',error.message);throw error;} finally{this.busy=false;}
 }
}
