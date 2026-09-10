# Cognitive IQ Lab v6

Cognitive IQ Lab 是一個原創、多構面的 IQ-style 認知測驗網站。定位是認知遊戲／自我探索工具，不是臨床、教育或就業用的正式智力鑑定。

## Question Bank v3.2

目前題庫版本：`QB-2026.09.3`，選項品質修訂：`3.2`。

- 300 題原創母題庫
- 6 個認知構面 × 每構面 50 題
- 每構面：20 基礎、20 中等、10 進階
- 每次平衡抽 30 題；每構面固定 5 題（2 基礎 + 2 中等 + 1 進階）
- 最近 8 份題組曝光控制；目前比例可讓前 10 份題組先走完 300 題再重複
- 300 個唯一 task signature
- 只有處理速度題有硬性倒數；工作記憶刺激顯示 3 秒，其餘主要推理題不限時

### v3.2 選項品質

v3.2 不再只檢查「有四個答案」，而是降低從選項外觀直接猜答案的機會：

- 20 題語文類比改用語意相近、同層級的原創干擾選項
- 數字／矩陣題在可行模型中使用「單一規則犯錯」或近似值 distractor
- 符號矩陣的錯誤選項維持同一符號家族，只改變真正相關的規則
- 靜態檢查選項格式、長度提示、重複選項與符號家族提示
- 正確答案位置以 deterministic hash + quota 平衡，不使用容易察覺的 A→B→C→D 輪替
- 全 300 題正解位置：`A=75 / B=75 / C=75 / D=75`
- 最新 CI option-quality snapshot：20 curated analogies、115 near-miss items、0 static cue-risk items

題型與選項設計研究記錄見 `OPTION_QUALITY_RESEARCH.md`；題庫生成與授權原則見 `QUESTION_BANK_RESEARCH.md`。

## Item Quality QA+

結果頁提供「題庫品質 QA+」。資料只存在目前瀏覽器的 `localStorage`，不會自動上傳，也不保存姓名或帳號。

QA+ 會累積／分析：

- 題目曝光次數
- 答對率、跳過率、逾時率
- 平均作答時間與時間離散程度
- 每個 distractor 的選擇頻率
- distractor efficiency
- item-rest correlation（本機 N 足夠後）
- 設計難度與實際答對率是否明顯不一致
- 靜態選項提示風險
- A/B/C/D 正解位置平衡
- 高度重複的題幹族

工程門檻：

- `N < 10`：只累積，不做強判斷
- `N ≥ 20`：開始檢查 distractor efficiency；低於約 5% 選擇率視為需檢查訊號
- `N ≥ 30`：開始顯示 item-rest discrimination 訊號

這些仍然只是工程 QA，不等於 IRT 校準、信度、效度或人口常模。

## Single-Screen / Safari Safety

- 首頁、單題測驗、結果摘要以一個 viewport 為主要舞台
- `100dvh`、safe-area、手機與短高度 breakpoint
- 詳細說明、逐題解析與 QA 使用 overlay
- Matrix 依 viewport 縮放；密集符號會依格子內容縮字，避免 Safari 溢出
- 底部保留「上一題 / 下一題」導覽
- 未作答按下一題只會往前，不會清掉已存在答案
- 逾時題回看仍鎖定，但可再次往下一題
- 暖米白／紙張奶油色／深墨棕／古銅色 editorial palette

## 計時模型

- 語文理解：不限時
- 流體推理：不限時
- 視覺空間：不限時
- 量化推理：不限時
- 工作記憶：刺激只呈現 3 秒，作答不限時
- 處理速度：明確倒數；倒數到 0 永久鎖定，不能補答
- 顯示整份測驗總時間
- 不限時題不因慢而扣速度分
- 處理速度只有答對的限時題才可能取得速度因素加分

## 自動品質閘門

GitHub Actions `.github/workflows/question-bank-validation.yml` 會驗證：

- JavaScript syntax
- 300 題題庫結構與 10-form 完整覆蓋週期
- Question Bank v3.2 option quality
- Item Quality QA v2 計算邏輯
- Local item analytics
- Single-Screen UI 結構
- Matrix viewport safety
- Forward navigation / dense-matrix containment

## 主要檔案

- `index.html` — 主介面與 script/style 組裝
- `question-bank.js` — 300 題原始生成器與平衡抽題
- `answer-quality.js` — v3.2 原創 near-miss / distractor quality pass
- `answer-position-balance.js` — A/B/C/D 全庫平衡
- `item-analytics.js` — 第一代本機聚合統計
- `item-quality-v2.js` — QA+ / item-rest / distractor efficiency / preflight
- `timeout-lock.js` — 混合計時、總時間、逾時鎖定
- `navigation-layout-fix.js` — 非破壞式上一題／下一題導覽
- `matrix-layout-fix.css` / `viewport-stability.css` — Matrix 與短 viewport 安全
- `heritage-theme.css` — 暖色 editorial 視覺
- `OPTION_QUALITY_RESEARCH.md` — 選項／干擾選項研究與授權界線

## 執行方式

純前端專案，直接開啟 `index.html` 即可，不需要 build 或後端。

## 研究與權利界線

公開研究與開源實作只用來研究 item construction、Automatic Item Generation、distractor efficiency、IRT/CAT 與 UI/工程方法。本站不匯入或複製 WAIS、Stanford–Binet、Raven/Pearson 等受保護的正式題目、答案表、常模或專有計分。

## 重要限制

目前 `easy / medium / hard` 是設計難度，而非人口樣本校準後的 psychometric difficulty。`IQ-style Cognitive Index` 是網站實驗分數，不能視為正式 IQ、人口百分位或診斷結果。

> **不構成任何標準，好玩就好。** 內容僅供參考；若有出入，以你的想像力為準。
