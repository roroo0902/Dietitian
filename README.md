# 營養茲｜陪你吃好每一天

繁體中文、手機友善的個人飲食日記。v2 加入新版介面與私人 Google Sheets 讀寫功能；不需安裝套件或使用付費 AI API。

正式網站：https://roroo0902.github.io/Dietitian/

## 功能

- 今日總覽、七日日曆、四種餐別卡片。
- 25 項示範食物、自訂食物、搜尋與小數份數。
- 熱量、三大營養素、七日趨勢與 CSV／JSON 備份。
- 私人 Google Sheet 讀寫：飲食紀錄、自訂食物、目標設定；食物資料庫分頁為內建示範值的參考清單。
- 森林綠、奶油白、杏桃、淡紫介面與餐盤 SVG 插畫。

## 連接私人 Google Sheet

[開啟完整設定指南](GOOGLE_SETUP.html)。資料庫保持限制存取，不要公開。

1. 建立 Google Cloud 專案，啟用 Sheets API。
2. 設定 Google Auth Platform，建立網頁版 OAuth Client ID。
3. JavaScript origin：`https://roroo0902.github.io`，不包含專案路徑。
4. App → 設定與備份，填入 Client ID、確認試算表 ID、登入 Google。
5. 選擇採用雲端資料，或以本機覆蓋雲端，確認初次同步方向。

**完成 Client ID、Google 登入與初次確認前，不會自動上傳個人紀錄。**

### 同步與隱私

- 沿用既有 `nutriday-tw-v1` 本機資料，既有紀錄可繼續使用。
- Client ID 與試算表 ID 保存在本機設定。Access token 僅在記憶體，不寫入 localStorage、URL 或 GitHub。
- 使用 Google Identity Services token model，不需 Client Secret、API key 或 AI 金鑰。
- scope `https://www.googleapis.com/auth/spreadsheets` 允許以你身分讀寫 Google 試算表，Google 不把這個 scope 限縮至單一檔案。程式只對指定資料庫 ID 發出請求；請自行查看授權畫面。
- 確認方向後，每次修改先存本機，再短暫延遲上傳。寫入前比較雲端內容，以一個 batchUpdate 更新紀錄、自訂食物與設定，然後讀回驗證。
- 發現雲端變動、授權到期或請求失敗時暫停自動儲存；本機紀錄保留。重新整理後需重新登入。
- 手動覆蓋或採用雲端前保存一份本機復原點。仍建議定期匯出 JSON。
- 個人版沒有完整交易鎖，請避免多個裝置同時修改；不適用多人共用或臨床個案管理。

## 開發

Node.js 20+，無需 npm install：

```sh
npm run dev
npm test
```

開啟 `http://127.0.0.1:5179`。本機測試 Google 登入時，需另外把本機 origin 加入 OAuth Client。

## 程式結構

- `index.html`、`app.js`：入口、畫面與互動。
- `styles.css`、`brand-v2.css`：基本樣式與品牌改版。
- `data.js`、`math.js`、`storage.js`：示範資料、計算與本機保存。
- `cloud.js`、`cloud-ui.js`：Google 授權、資料轉換、同步、衝突檢查與復原。
- `meal-art.svg`、`favicon.svg`：品牌圖像。
- `GOOGLE_SETUP.html`：Google OAuth 設定與疑難排解。
- `tests/`：計算、驗證、雲端資料轉換及失敗情境測試。

GitHub Pages：main / 根目錄。保留這些檔案路徑，無需建置。

## 驗證與限制

12 項本機測試通過，桌機與手機畫面、新增半份紀錄已驗證。私人原生 Google Sheet 的分頁、欄位、數值與權限已核對。網站登入與個人紀錄的實際雲端往返，待擁有者完成 OAuth Client ID 後驗證。

內建營養數據仍是功能展示用估值，未匯入官方資料，也不代表已查核的品牌標示。本工具不提供診斷、醫療處方或自動判斷個人飲食需求。

程式碼沿用 MIT 授權。
