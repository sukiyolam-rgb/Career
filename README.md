# 澳門青年就業導航

繁體中文靜態招聘網站：GitHub Pages 提供頁面，Supabase 提供共用資料庫及服務員登入。無需 npm 建置。十個欄位包括崗位、公司、工作地點、行業、崗位類型、薪酬、學歷、發佈日期、截止日期（選填）及原招聘連結。

## 第一次設定 Supabase（必須完成）

1. 在 https://supabase.com/ 建立帳號及免費專案。選擇合適區域，資料庫密碼自行安全保存，不要填入網站程式。
2. 在專案 **SQL Editor** 建立查詢，貼上 [supabase/setup.sql](supabase/setup.sql) 的內容並執行。建立公開招聘表、服務員授權表及 Row Level Security 權限。
3. 在 **Authentication → Users → Add user / Create new user** 建立服務員的電郵及密碼帳號，確認電郵或勾選確認選項。記下該使用者的 **User UID**。
4. 在 SQL Editor 單獨執行下列 SQL，將 UID 替換為剛建立的使用者 UUID：

   ```sql
   insert into public.staff_admins(user_id)
   values ('服務員的 User UID') on conflict do nothing;
   ```

   日後新增服務員，重複步驟 3–4。撤銷權限：`delete from public.staff_admins where user_id = '要撤銷的 UID';`。刪除帳號也會刪除其授權。
5. 在專案 **Connect** 或 **Settings → API / API Keys** 複製 **Project URL** 和 **Publishable key**（`sb_publishable_…`）。舊版 **anon** 公開金鑰亦可。將兩項填入 [assets/config.js](assets/config.js)。**絕不可使用 `service_role`、`sb_secret_…` 或帳號密碼。** 公開金鑰可出現在前端，寫入權限由資料庫 RLS 與登入者身分控制。
6. 在 **Authentication → URL Configuration** 把 Site URL 設為 `https://sukiyolam-rgb.github.io/Career/`。直接電郵密碼登入不依賴 redirect；若日後用邀請信或重設密碼，再設定對應 redirect URL 和頁面流程。
7. 建議在 Authentication 設定關閉公開註冊，只由管理員新增帳號。本網站不提供自行註冊功能；即使一般帳號登入，也必須列入 `staff_admins` 才能管理。
8. 提交及推送 `assets/config.js`，等待 GitHub Pages 部署完成。到 `admin.html` 用服務員電郵與密碼登入，新增一個真實崗位，再用**另一個瀏覽器或無痕視窗**打開首頁，核對資料已同步。測試未授權帳號不能進入管理介面。

上述專案建立、SQL 執行和公開設定尚未完成前，頁面會明確顯示「尚未連接共用資料庫」，不會使用本地假資料代替。

## 資料如何更新

後台新增、編輯、刪除會直接寫入 Supabase，不需要每次重新部署 GitHub Pages。新訪客讀取共用資料；已開啟網站的訪客每分鐘檢查更新，也可按「更新資訊」或返回頁面立即載入。網絡或資料庫故障時顯示載入失敗，不能保證離線使用。免費專案的額度及閒置暫停規則請以 Supabase 當前方案為準。

登入 token 只保存在頁面記憶體，重新整理後須再次登入；過期後也須重新登入。舊的寫死管理密碼已移除。資料庫對匿名訪客只開放閱讀，只有列入 `staff_admins` 的使用者能新增／編輯／刪除。可讀取的招聘資料是公開資料，**不可放入青年主檔、個案檔、履歷或聯絡資料**。

目前前台最多載入 2000 個崗位，超過上限會提示管理員整理資料。多人同時編輯同一崗位以最後成功寫入為準，請協調操作。JSON 匯入會取代全部共用崗位，使用交易整批驗證，失敗時回滾；先匯出備份再匯入。

## 從舊版本遷移

舊 localStorage 資料不會自動上傳或刪除。改版前，從舊版後台匯出 JSON 備份；若已改版，可在原瀏覽器開啟舊站同來源的開發者工具 Console 執行 `localStorage.getItem('macau-youth-jobs-v1')`，自行保存為 `{"version":1,"jobs":[…]}` 格式。不要把青年個人資料貼到聊天中。

在備份中為每個崗位補上 `"location":"實際工作地點"`，然後用新版後台的「匯入備份」。沒有工作地點的備份會被拒絕，避免錯誤填造地點。可匯出新版 JSON 備份留存。

## 截圖 OCR

Tesseract.js 5.1.1 及官方中英文模型隨網站附帶，不需要 AI API 金鑰，不會將圖片傳往辨識服務。PNG、JPEG、WebP、BMP 最大 10 MB。首次約需下載 13 MB 執行資源。從有明確標籤的文字提取工作地點等欄位，識別後需人工校正，再按確認儲存，不會自動發布。

## 本地開發及部署

```sh
cd /workspace/Career
python3 -m http.server 8000 --bind 0.0.0.0
```

GitHub 倉庫 Settings → Pages → Source 選 **GitHub Actions**。推送 `main` 會執行 `.github/workflows/static.yml`；保留既有部署流程並只發布網站檔案，避免兩個流程同時部署。

修改文字：`index.html` / `admin.html`；配色：`assets/style.css`；公開設定：`assets/config.js`；資料驗證與 Supabase 請求：`assets/app.js`；後台/OCR：`assets/admin.js`；卡片及搜尋：`assets/public.js`。Supabase 使用標準 REST/Auth API，無外部 JavaScript SDK 依賴。

## 驗證範圍

瀏覽器測試可驗證畫面、請求與錯誤處理；在 Supabase 專案及帳號尚未提供前，不能宣稱真實登入、RLS 權限或跨裝置雲端同步已驗證。完成設定後須執行上述無痕視窗和權限驗證。

可重跑的前端整合測試：在有 Python Playwright 和 `/usr/bin/chromium` 的環境啟動網站後，執行 `python3 tests/test_cloud_flow.py`（可用 `CAREER_TEST_URL` 指定本地服務 URL）。測試模擬 Supabase API，不會使用真實帳號、修改真實資料庫，也不能取代 RLS 與真實同步驗證。

每次 Pages 部署會把提交 SHA 作為 JS/CSS URL 版本，避免新版設定沿用舊快取。若剛修改設定仍出現缺少 URL／公開金鑰，先確認 Actions 最新部署為綠色勾號，再強制重新整理（Windows：Ctrl+Shift+R；Mac：Cmd+Shift+R）。

## 更新：多條件篩選及文案提取

**已建立資料庫的使用者：** 在同一 Supabase 專案的 SQL Editor 貼上 `supabase/upgrade-filters.sql` 並執行一次。此檔只新增 `industry`、`job_type` 欄位及更新備份匯入函式，不刪除既有崗位或授權。新專案使用完整 `supabase/setup.sql` 即可。

舊崗位的新欄位初始為空，前台顯示「未分類」。後台新增／編輯時需填寫行業及崗位類型，可從建議選項選擇或輸入其他分類。尚未執行資料庫更新時，新增／編輯可能回報找不到欄位，請先更新 SQL 再重試，不要重建或清空資料表。

前台支援學歷、工作地點、行業、崗位類型交集篩選及關鍵字搜尋。選項來自實際崗位資料。地點標籤依地區配色，同地區使用相同色系，並保留文字。

後台新增「招聘文案」文字框。複製文案並貼上後，按提取即可使用規則解析標籤、日期、薪酬等，再核對表單後儲存。這是本機文字提取，不使用生成式 AI、不上傳文案；沒有明確標示的公司、行業等欄位會留待人工確認。不會因提取文字或 OCR 而自動發布。輸入上限 30,000 字。

服務簡介入口及 `service.html` 展示服務內容、電話、電郵、地址及辦公時間。

## 視覺更新（方案 3）

首頁採用青綠插畫、獨立搜尋列及雙欄招聘卡片，手機版為單欄。搜尋、四項篩選、共用資料和後台功能維持原有行為。這次視覺更新不需新增 SQL。插畫位於 `assets/hero-career.png`；Phosphor 圖示的授權位於 `assets/icons/LICENSE`。校對結果見 `design-qa.md`。

## Excel 模板及批量新增

登入後在「已儲存崗位」區域按「下載 Excel 模板」，在第一個工作表「崗位資訊」填寫十個欄位，每行一個崗位。截止日期可留空，其餘九欄必填。第二個「填寫指南」工作表包含規則與範例，不會被匯入。

儲存為 `.xlsx`，在後台選擇檔案。系統會讀取第一個工作表（優先使用「崗位資訊」），驗證欄位、日期、URL、必填資訊、資料長度和重複內容，顯示行號及前 20 筆預覽。任何一筆錯誤都會阻擋整批匯入；修正 Excel 後重新上傳。

核對後按「確認並批量新增」。以一次 Supabase/PostgREST 陣列 INSERT 新增，不取代現有崗位、不修改已有資料，不需要新的 SQL 函式；伺服器按交易處理，資料不合規時整批回滾。寫入時仍沿用服務員登入和現有 RLS 權限。

完全相同的十個欄位（去除首尾空白、日期格式標準化後）會略過，包括同一檔內及讀取當時資料庫中的重複。相似但不同的崗位不會自動合併，也不提供編輯既有崗位的 Excel 更新。確認前會再讀取最新資料；不同服務員同時匯入的全域重複仍需人工協調。網絡中斷可能造成結果不明，請先更新列表確認再重傳。

支援文字日期 YYYY-MM-DD、YYYY/MM/DD 及真正 Excel 日期；截止日期也接受「不設截止」。不支援 `.xls`、密碼保護檔案或公式；先貼上值並另存 `.xlsx`。上傳最大 10 MB、解壓資料上限 40 MB、每次最多 2000 筆（目前整站最多保留 2000 筆的前台限制）。請勿在模板加入青年／個案私人資料。Excel 在瀏覽器解析，只有確認後的崗位欄位會送至 Supabase。

ExcelJS 4.4.0 瀏覽器套件隨網站附帶並按需載入，授權及來源見 `assets/vendor/exceljs/`。可執行 `python3 tests/test_excel_flow.py` 測試真實 XLSX 讀寫及模擬 API 批量寫入流程；這不是對真實資料庫的測試。
