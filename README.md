# 澳門青年就業導航

HTML/CSS/JavaScript 網站，GitHub Pages 提供頁面，Supabase 提供共用資料和服務員登入。沒有 npm 建置步驟。網站包括招聘資訊、培訓項目、政策資訊及服務簡介，後台統一管理前三類內容。

## 已使用舊版：這次如何更新

在同一 Supabase 專案的 **SQL Editor** 執行 [supabase/upgrade-content.sql](supabase/upgrade-content.sql) 全部內容一次。它保留現有崗位及服務員授權，新增：

- `jobs.role_category`：職業／崗位類別，如行政、醫生、法律、工程、傳媒。
- `trainings`：培訓資料及多個主辦單位、包含行業、包含崗位。
- `policies`：澳門大灣區、橫琴及澳門當地三種就業政策分類。
- 新資料表的公開閱讀和服務員管理 RLS，以及保留新欄位的 JSON 備份匯入函式。

舊崗位類別初始為空，顯示「未分類」，請編輯補填；原全職／兼職等 `job_type` 資料保留，介面改稱「聘用形式」。更新 SQL 也補齊舊版行業和聘用形式欄位，不必先執行其他升級檔。SQL 可重跑，不會自動新增示範資料或刪除現有內容。未完成資料庫更新時，新欄位的儲存及新頁面資料讀取會失敗；舊招聘資料仍可讀取。

## 新專案初始化

1. 在 https://supabase.com/ 建立專案，資料庫密碼自行保存，不要寫進網站。
2. SQL Editor 執行完整 `supabase/setup.sql`（已包含最新欄位和內容資料表）。
3. **Authentication → Users → Create user** 建立服務員電郵／密碼，確認其電郵；複製 User UID。
4. SQL Editor 授權該帳號：

   ```sql
   insert into public.staff_admins(user_id)
   values ('服務員的 User UID') on conflict do nothing;
   ```

5. 在 **Settings → Data API / API Keys** 或 **Connect** 複製 Project URL 和 Publishable key（`sb_publishable_…`），填入 `assets/config.js`。URL 為 `https://專案代碼.supabase.co`，不加 `/rest/v1/`。也支援 legacy anon 公開金鑰。**禁止填入 service_role、sb_secret_* 或帳號密碼。**
6. Authentication 的 Site URL 設為正式網站網址。沒有公開註冊按鈕，建議關閉公開註冊；登入者還必須存在於 `staff_admins` 才能修改資料。
7. 推送設定到 GitHub，等待 Pages 部署完成，測試服務員登入、未授權帳號拒絕、以及另一個瀏覽器讀取最新資料。

撤銷服務員權限：`delete from public.staff_admins where user_id = '該帳號 UID';`。刪除 Auth 帳號也會移除其授權。登入 token 只保存在頁面記憶體，重新整理／過期後須再次登入。

## 招聘資訊及複製分享

崗位資料包括名字、公司、地點、行業、聘用形式、崗位類別、薪酬、學歷、發佈日期、可選截止日期和原招聘連結。前台可搜尋和組合篩選，地點標籤有不同配色。

卡片的「複製崗位資訊」會生成帶服務名稱及上述欄位的純文字，便於自行貼到聊天或電郵；網站不會替使用者發送訊息。沒有截止日期顯示「不設截止」，已過截止日期的分享文字附提示。瀏覽器拒絕剪貼簿存取時會提供可手動複製的對話框。

**OCR 圖片及招聘文案提取已移除**，相應 OCR 套件和語言模型也已移除。後台使用手動表單或 Excel 匯入。

## Excel 模板及崗位備份

登入後下載 `.xlsx` 模板，第一個「崗位資訊」工作表每行一個崗位，第二個工作表是指南和示範，不會匯入。新版增加「崗位類別」第十一欄；「截止日期」「崗位類別」可留空，舊十欄模板仍支援，舊「崗位類型」標題視為聘用形式。後台手動新增／編輯時須填寫崗位類別，舊 Excel 空值會留待補填。

上傳後顯示前 20 筆預覽及帶行號錯誤。任何一筆不合規都會阻擋匯入。確認後用單次 PostgREST 陣列 INSERT 新增，不覆蓋原資料；完全相同的欄位組合略過。不同服務員同時匯入的重複仍需人工協調。網絡中斷後先重新載入確認結果，不要盲目重試。

支援標準文字日期、Excel 日期儲存格及空白截止日期；不支援公式、密碼保護或舊版 `.xls`。上限 10 MB、解壓 40 MB、單次 2000 筆。ExcelJS 4.4.0 隨網站附帶，來源及 MIT 授權見 `assets/vendor/exceljs/`。

原有 JSON 匯出／匯入只包含崗位資料；匯入會確認後取代全部崗位，以單一交易驗證，失敗回滾。定期另行在 Supabase 備份培訓及政策資料。所有資料都為公開資訊，**不要存入青年主檔、個案檔、履歷或聯絡資料**。

## 培訓項目

`training.html` 展示培訓名字、可多選的主辦單位、報名開始及可選截止日期、詳情連結、包含行業和包含崗位。可依關鍵字、行業及崗位篩選。

在後台的「培訓項目」頁籤新增／編輯／刪除。主辦單位可勾選既有名稱，也可加入其他名稱；行業和相關崗位以頓號、逗號或分行填多項。報名截止日期不可早於開始日期，已截止／未開始會提示。資料儲存後所有訪客可讀取，無需重新部署。

## 政策資訊

`policies.html` 按「澳門大灣區就業政策」「橫琴就業政策」「澳門當地就業政策」分組展示。後台可填寫標題、分類、簡介、發佈日期和官方／詳情連結。沒有預載或自動生成政策內容；請由服務員核對官方資訊後發布。

三種資料頁在開啟、手動更新、返回可見狀態，以及每分鐘自動更新時讀取共用資料。網絡故障會顯示錯誤，不承諾離線使用。每類前台最多載入 2000 筆；多人同時編輯以最後成功寫入為準。Supabase 免費額度與閒置暫停規則以其當前方案為準。

## 開發及部署

```sh
cd /workspace/Career
python3 -m http.server 8000 --bind 0.0.0.0
```

GitHub **Settings → Pages → Source** 選 **GitHub Actions**，`main` 推送會執行 `.github/workflows/static.yml`，只發布網站頁面及 `assets/`。JS/CSS 使用提交 SHA 版本避免舊快取。域名及網站歸屬仍以實際 Pages 設定為準。

修改：`index.html` / `training.html` / `policies.html` / `service.html`（文字與頁面）；`assets/style.css`（綠色配色）；`assets/app.js`（招聘 API）；`assets/share.js`（複製內容）；`assets/resources.js`（培訓／政策 API）；`assets/admin.js`、`assets/resource-admin.js`（後台）；`assets/excel.js`（Excel）。

## 測試

需要 Python Playwright 和 `/usr/bin/chromium`。先啟動 HTTP 服務，再執行：

```sh
python3 tests/test_cloud_flow.py
python3 tests/test_excel_flow.py
python3 tests/test_resources_flow.py
```

可用 `CAREER_TEST_URL` 指定本地 URL。測試使用模擬 Supabase API，不使用真實帳號／資料，不代表真實 RLS 或部署已驗證。SQL 已用 PostgreSQL 語法解析器檢查，但必須在自己的 Supabase 專案實際執行更新，再驗證登入、授權、寫入及跨瀏覽器同步。
