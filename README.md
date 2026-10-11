# 損益分析中心（pl-center）

品牌加辣餐飲顧問工作室給餐飲業主使用的損益儀表板網站。業主註冊 → 顧問開通並指定品牌 → 業主登入查看自己的儀表板、匯出 Excel。

- 網址：https://marvintien90-jpg.github.io/pl-center/
- 後端：Supabase 專案 `thxqncpkkzmpktwuvzvz`（與 BOM 運算中心共用登入帳號，授權各自獨立）
- 第一階段（唯讀）：登入、註冊、忘記密碼、開通與授權、儀表板、匯出

## 檔案
- `index.html`：建置產物，GitHub Pages 直接提供。不要手改。
- `src/page.html`：版面與網站外殼樣式
- `src/base.css`、`src/core.js`：樣式與計算、圖表核心（取自內部損益分析系統，兩邊算法必須一致）
- `src/app.js`：登入、帳號狀態、讀資料、匯出、帳號與授權後台
- `src/build.js`：`node src/build.js` 產生 `index.html` 並做語法檢查

## 資料表
`pl_profiles`（帳號）、`pl_access`（誰能看哪個品牌／分店）、`pl_brand_settings`（業態與燈號門檻）、`pl_mail_log`（寄信紀錄）；
損益數字在 `pl_statements`、`pl_line_items`。所有權限都擋在資料庫的讀取規則，畫面隱藏只是輔助。
