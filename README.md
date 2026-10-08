# 澳門青年就業導航

繁體中文靜態招聘資訊網站，使用 HTML、CSS、JavaScript，可部署至 GitHub Pages。無需 npm、建置或後端。

## 本地啟動

```sh
cd /workspace/Career
python3 -m http.server 8000 --bind 0.0.0.0
```

瀏覽 `index.html` 查看招聘資訊，`admin.html` 管理崗位。首次使用沒有崗位，不會填入虛構招聘。

## 管理登入

初始密碼：`M8!qR4#zN7@vT2$k`。在 `assets/admin.js` 的 `ADMIN_PASSWORD` 修改。登入狀態僅保存在頁面記憶體，重新整理或登出後需要再次登入。

**前端密碼可從程式碼讀取，不能提供真正的身份驗證或資料安全。** GitHub Pages 公開發布所有靜態檔案。此網站不可存放青年主檔、個案檔、履歷、聯絡資料或其他敏感資料。

## 資料及備份

八個欄位：崗位名字、公司名字、工作地點、薪酬、學歷要求、發佈日期、截止日期（選填）、原招聘連結。新增後可編輯、確認刪除。前台可搜尋崗位、公司、學歷、工作地點及選擇學歷篩選。沒有截止日期顯示「不設截止」，過期崗位會標示。

資料存於 `localStorage` 的 `macau-youth-jobs-v1`，僅在相同來源、同一瀏覽器共享。**服務員新增的資料不會同步到其他青年的瀏覽器。** 清除網站資料、改用其他裝置或從本地切換至 GitHub Pages 均不會自動保留資料。使用後台 JSON 匯出／匯入備份；匯入會在確認後取代全部資料。網站沒有青年主檔或個案管理功能。

若日後需要所有青年看到同一份最新招聘，需另行使用集中資料來源（例如提交公開 JSON 至 GitHub，或建立具有真正身份驗證的後端）；目前版本嚴格使用使用者要求的本地儲存模式。

## 截圖識別

按需載入隨網站附帶的 Tesseract.js 5.1.1，以繁體中文、簡體中文及英文進行瀏覽器 OCR，不使用生成式 AI，也不需要 API 密鑰。OCR 引擎、WebAssembly 核心及官方 tessdata_fast 模型均放在 `assets/vendor/ocr/`，不依賴外部 CDN。圖片在瀏覽器中處理，不會上傳到辨識服務。首次使用需要從本站下載約 13 MB 的執行資源並初始化，下載失敗會顯示錯誤，可改手動填寫。官方模型版本及授權見 `assets/vendor/ocr/SOURCES.md`。

支援 PNG、JPEG、WebP、BMP，最大 10 MB。識別後顯示原文，並提取標示為「崗位／職位」「公司」「工作地點」「薪酬」「學歷」「發佈日期」「截止日期」的欄位及 http/https 連結。無明確標籤的欄位可能無法提取，識別準確度取決於圖片品質及排版。所有內容均須人工校正，按「確認並儲存崗位」後才新增。日期及連結驗證不通過時不會寫入。

## GitHub Pages 部署

1. 將本專案檔案推送至 `sukiyolam-rgb/Career` 的 `main` 分支。
2. 在 GitHub 倉庫 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。
3. 執行已附的 `.github/workflows/pages.yml`（推送 main 會自動執行，也可手動執行）。
4. 在 Actions 查看部署成功後，使用 Pages 設定頁提供的網址。

工作流程只發布 `index.html`、`admin.html` 及 `assets/`，不發布說明文件。所有資源使用相對路徑，支援 GitHub Pages 的專案子路徑。

## 修改位置

- 服務名稱及文字：`index.html`、`admin.html`
- 顏色、字體、響應式排版：`assets/style.css` 頂部變數
- 管理密碼、OCR 與資料操作：`assets/admin.js`
- 共用資料格式及驗證：`assets/app.js`
- 招聘卡片及搜尋：`assets/public.js`

舊版本本地資料／備份沒有工作地點時，顯示「未提供」，不會清除資料。新增或編輯時需填入工作地點。
