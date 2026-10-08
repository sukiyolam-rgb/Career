# 澳門青年就業導航

繁體中文靜態招聘網站：GitHub Pages 提供頁面，Supabase 提供共用資料庫及服務員登入。無需 npm 建置。八個欄位包括崗位、公司、工作地點、薪酬、學歷、發佈日期、截止日期（選填）及原招聘連結。

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
