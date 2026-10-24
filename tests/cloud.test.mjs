import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {stateToRows,rowsToState,SheetConnection,sheetIdFrom}=await import('../cloud.js');
const settings=[['設定鍵','設定值','說明'],['kcalGoal',2000,''],['proteinGoal',90,''],['schemaVersion',1,''],['updatedAt','',''],['revision','','']];
const food={id:'rice-1',name:'飯 =SUM(A1)',serving:'1 碗',kcal:252,protein:4.5,carbs:56,fat:.5,emoji:'🥗',source:'custom',category:'自訂'};
const state={version:1,settings:{kcalGoal:2000,proteinGoal:90},entries:[{id:'entry-1',date:'2026-10-24',meal:'lunch',food,quantity:.5,createdAt:'2026-10-24T05:00:00Z'}],customFoods:[food]};
test('Google Sheet 資料往返保留份數、數值與原始食物快照',()=>{const rows=stateToRows(state);assert.deepEqual(rowsToState(rows.entries,rows.foods,settings),state);});
test('錯誤的欄位與版本不可當成空白資料覆寫',()=>{const rows=stateToRows(state);assert.throws(()=>rowsToState([['錯欄位']],rows.foods,settings));assert.throws(()=>rowsToState(rows.entries,rows.foods,settings.map(r=>r[0]==='schemaVersion'?['schemaVersion',2,'']:r)));});
test('試算表 ID 與網址解析只接受合規的 Google Sheet ID',()=>{assert.equal(sheetIdFrom('https://docs.google.com/spreadsheets/d/12345678901234567890/edit'),'12345678901234567890');assert.throws(()=>sheetIdFrom('https://evil.example/sheet'));});
function fakeConnection(remote=state) {
 const values=stateToRows(remote);let writes=0,lastBody;
 const fetcher=async(url,options={})=>{
  let body;
  if(options.method==='POST') {writes++;lastBody=JSON.parse(options.body);return {ok:true,json:async()=>({})};}
  if(url.includes('/values:batchGet'))body={valueRanges:[{values:values.entries},{values:values.foods},{values:settings}]};
  else body={sheets:['飲食紀錄','自訂食物','設定'].map((title,i)=>({properties:{title,sheetId:i+1,gridProperties:{rowCount:1000,columnCount:26}}}))};
  return {ok:true,json:async()=>body};
 };
 const c=new SheetConnection(fetcher);c.token='test';c.expires=Date.now()+100000;
 return {c,get writes(){return writes;},get body(){return lastBody;},values};
}
test('未讀取過雲端資料時，自動上傳必須停止且不得寫入',async()=>{const f=fakeConnection();await assert.rejects(()=>f.c.push(state),/雲端有另一份資料/);assert.equal(f.writes,0);assert.equal(f.c.status,'error');});
test('雲端被其他裝置修改時，自動儲存會停止',async()=>{const f=fakeConnection();await f.c.pull();f.values.entries[1][4]='另一裝置改過的食物';await assert.rejects(()=>f.c.push(state),/雲端有另一份資料/);assert.equal(f.writes,0);});
test('寫入一次原子批次且文字以 stringValue 傳送，成功需讀回驗證',async()=>{const f=fakeConnection();await f.c.pull();await f.c.push(state);assert.equal(f.writes,1);assert.equal(f.c.status,'saved');const r=f.body.requests.filter(x=>x.updateCells);assert.equal(r.length,3);assert.deepEqual(r[0].updateCells.rows[1].values[4],{userEnteredValue:{stringValue:'飯 =SUM(A1)'}});assert.deepEqual(r[0].updateCells.rows[1].values[6],{userEnteredValue:{numberValue:.5}});});
test('伺服器拒絕寫入時不能顯示成功',async()=>{const f=fakeConnection();await f.c.pull();const old=f.c.fetcher;f.c.fetcher=(u,o)=>o?.method==='POST'?Promise.resolve({ok:false,status:403,json:async()=>({})}):old(u,o);await assert.rejects(()=>f.c.push(state),/Google 拒絕存取/);assert.equal(f.c.status,'error');assert.equal(f.c.lastSaved,'');});
test('過期 token 不得呼叫 API',async()=>{let called=false;const c=new SheetConnection(async()=>{called=true});c.token='expired';c.expires=1;await assert.rejects(()=>c.read(),/尚未登入/);assert.equal(called,false);});
