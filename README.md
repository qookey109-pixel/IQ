# Cognitive IQ Lab v6

Cognitive IQ Lab 是一個原創、多構面的 IQ-style 認知測驗網站。

## Question Bank v3.1

目前題庫版本：`QB-2026.09.3`，品質修訂：`3.1`。

- 300 題原創母題庫
- 300 個唯一 task signature，不以不同 ID 假裝不同題
- 6 個認知構面，每個構面 50 題
- 每構面母題庫難度配置：20 基礎、20 中等、10 進階
- 每次測驗平衡抽取 30 題
- 每個構面固定抽 5 題
- 每份測驗每構面難度比例：2 基礎、2 中等、1 進階
- 近期題目曝光控制：避開最近 8 份題組
- 完整曝光週期：在目前固定比例下，前 10 份題組可先走完 300 題後再開始重複
- 每題具有穩定 ID、題型模型、難度、來源、題庫版本與 revision metadata
- 執行時驗證題數、ID 唯一性、題面唯一性、選項、答案、構面、難度分布、矩陣格式與計時規則
- GitHub Actions 會在 PR / push 自動執行題庫 validation

300 題採「受控原創題型模型（controlled original item models）」產生，而不是從網路或正式商業測驗複製題目。題型架構參考公開的認知測驗研究、Automatic Item Generation、IRT/CAT 與 item exposure control 方法。

目前 `easy / medium / hard` 是設計難度標籤，尚未經人口樣本與 IRT 校準，因此不能視為正式心理計量難度。

## v6 功能

- 正式測評風格首頁
- 原創 matrix reasoning 類型題目
- 點選答案後自動前往下一題
- 可回上一題修改答案
- 快速跳題
- 每題切換動畫
- 工作記憶與處理速度題型
- 題目旁明確標示「限時」或「不限時」
- 語文、流體推理、視覺空間與量化推理不限時
- 工作記憶刺激呈現 3 秒，作答本身不限時
- 工作記憶刺激每次測驗只呈現一次；回到舊題不會重播
- 處理速度題使用明確倒數
- 限時題最後 5 秒加強視覺提醒
- 限時題逾時後永久鎖定：不能再選答案，選項會消失
- 顯示整份測驗的總累積時間
- 不限時題不因作答較慢而被扣速度分
- 處理速度構面只有「答對」的限時題才可取得速度加分，答錯但很快不會被獎勵
- 高級結果圖表：能力分布雷達圖、答題結構環形圖、構面比較長條圖

## 題型模型

Question Bank v3.1 目前包含多個原創生成模型，例如：

- 語文理解：類比關係、二段式與三段式邏輯推理
- 流體推理：符號數量規律、數字矩陣、兩步矩陣規則
- 視覺空間：單次旋轉、複合旋轉、鏡像＋旋轉
- 工作記憶：倒序、排序、字母／數字擷取、位置選擇後轉換
- 處理速度：目標字串快速比對、異類符號組辨識
- 量化推理：百分比、乘法關係、數列差值、比例、遞迴與連鎖比例

## 自動品質檢查

`tests/question-bank-validation.js` 會驗證：

- 題庫總數必須為 300
- 300 個 task signature 必須全部唯一
- 每構面必須為 50 題，且難度為 20 / 20 / 10
- 每份 30 題必須維持六構面各 5 題與 2 / 2 / 1 難度比例
- 只有處理速度題可以有硬性倒數
- 選項必須為 4 個且互不重複
- 正確答案 index 必須有效
- 前 10 份題組應完整覆蓋 300 題且不重複

GitHub Actions workflow：`.github/workflows/question-bank-validation.yml`。

## 執行方式

直接開啟 `index.html` 即可使用。網站為純前端，不需要建置步驟或後端服務。

## 檔案結構

- `index.html` — 首頁、測驗與結果頁結構
- `styles.css` — UI、RWD、題目切換動畫與圖表樣式
- `questions.js` — 舊版 30 題基礎題組，保留作為版本沿革
- `question-bank.js` — Question Bank v3.1、300 題原創生成器、平衡抽題、曝光週期與 runtime validation
- `app.js` — 基礎答題流程、返回上一題、結果計算與圖表繪製
- `timeout-lock.js` — 限時／不限時模式、總測驗時間與逾時鎖定
- `assessment-quality.js` — 工作記憶單次呈現、處理速度正確性條件與結果品質保護
- `tests/question-bank-validation.js` — Node 題庫驗證
- `.github/workflows/question-bank-validation.yml` — GitHub Actions 品質閘門
- `QUESTION_BANK_RESEARCH.md` — 題庫研究依據、授權與設計決策

## 版本沿革

- v2：30 題、多構面 IQ-style 測驗
- v3：明亮介面、上一題、自動下一題
- v4：更清晰、大字版
- v5：正式版 UI + 題目轉場動畫
- v6：正式首頁 + matrix 題 + 高級圖表 + 混合計時模式 + 題庫版本化
- Question Bank v1：42 題母題庫、每次平衡抽 30 題
- Question Bank v2：60 題母題庫、每構面 10 題、降低立即重測的題目重複
- Question Bank v3：300 題原創受控生成題庫、每構面 50 題、最近 8 份題組曝光控制
- Question Bank v3.1：移除重複題面、改善生成參數、加入 300 題完整曝光週期、單次記憶呈現、速度計分修正與 CI 驗證

## 重要限制

本網站不是 WAIS、Stanford–Binet 或 Raven’s Progressive Matrices 的正式線上版本，也未使用其正式題目、常模、答案表或專有計分演算法。

目前顯示的 IQ-style Cognitive Index 僅供自我訓練與產品實驗參考，不應用於醫療、教育鑑定、升學或就業決策。

真正要建立可正式解釋的標準分數，需要蒐集真實受測資料，再進行題目難度與鑑別度、信度、效度、測量偏誤／不變性、年齡分層常模及標準分數換算。
