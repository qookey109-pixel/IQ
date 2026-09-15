# 圖表可讀性更新與驗證

日期：2026-09-14。基準：`2b219f1`，來源分支 `origin/feature/cognitive-iq-lab-v6`。
實作分支：`improvement/diagram-readability`。本輪僅本機修改，尚未推送或部署。

## 範圍

- 保留正式 2,058 題、294 構念變體、42 題型家族及每份 42 題的抽卷。
- 移除題目圖示的裝飾框、背景、陰影；保留必要表格線。
- 7 個空間家族的 SVG 依內容取景，intrinsic dimensions 與 viewBox 比例一致。
- 加大高度表數字、方向與操作標示；加強障礙格對比，最短路徑 S/E 置於各自格子內。
- 矩陣放大至可用寬度（上限 330px），桌面保留兩欄，手機先題意再圖再選項。
- 短畫面改為題卡內捲動；換題重設閱讀位置。記憶題不套用空間題樣式。
- 首頁簡化說明，完整題庫結構仍在「怎麼測？」；README 開頭同步目前正式版本。
- 避免 single-screen.js 重複載入已有的樣式與導覽程式。

## 驗證

1. 執行目前 CI 所列 23 個 tests/* validation 程式。
2. 新增 `tests/visual-readability-validation.js`：
   - 2,058 題的題幹、選項、正解、計時、記憶刺激、矩陣及空間模型與基準 SHA-256 一致。
   - 392 張 SVG 的 intrinsic ratio、可及性標示及投影／路徑標記驗證。
3. 內嵌瀏覽器：8 種視覺題型 × 5 種 viewport，共 40 組：
   - 320×640、390×844、768×1024、1024×600、1366×900。
   - 圖形沒有超出容器；不與題幹／選項重疊；無題卡橫向溢出。
4. 392 張空間 SVG 的文字、矩形、線、圓與箭頭逐一比對瀏覽器實際繪製範圍：0 個超出 viewBox。
5. 正式頁面的 42 題完整導覽、選答案自動前進、完成及結果頁通過。
   本機測試答對 1 題，其餘跳過，結果正確顯示 1/42；不代表真實受測紀錄。
6. JavaScript syntax 與 git diff --check 通過。

## 本機重現

```sh
node tests/compact-final-production-validation.js
node tests/visual-readability-validation.js
node scripts/build-visual-review.js
python3 -m http.server 8891 --bind 127.0.0.1
```

- 正式頁面：http://127.0.0.1:8891/
- QA 專用頁：http://127.0.0.1:8891/.visual-review.html
- QA 頁以正式 HTML/CSS/renderer 建立，可從選單切換所有 448 個視覺題項（392 空間＋56 矩陣）。不是正式抽卷。
- QA HTML 是 gitignored 的本機生成檔，不應提交或加入首頁連結。

## 限制與下一步

- 以上為內嵌瀏覽器與 viewport 測試，未宣稱已在實體手機或各版本 Safari/Chrome 全部驗證。
- 本次不新增題目，也不把更換數字宣稱為新的語意／推理規則。
- 尚未推送、合併、執行 GitHub Actions 或部署 Render。
- 發佈前重新讀取 remote 與部署來源，確認沒有更新衝突，再推送本輪提交。不得推送舊 work/IQ 中落後的 v4 提交覆蓋 QB5。
