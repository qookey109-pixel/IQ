# Cognitive IQ Lab v6

Cognitive IQ Lab 是一個原創、多構面的 IQ-style 認知測驗網站。定位是認知遊戲／自我探索工具，不是臨床、教育或就業用的正式智力鑑定。

## Question Bank v4.0

目前題庫版本：`QB-2026.09.4`，revision：`4.0`。

- 5,124 個題庫項目
- 42 個 task families，6 個認知構面，每個構面 7 個 family
- 語文理解：84 個獨立項目（7 families × 12）
- 其他五構面：35 個 family × 144 個可重現 controlled variants = 5,040
- 5,124 不代表 5,124 篇獨立撰寫文章；variant 是同一推理模板的受控參數變體
- `semanticKey` 代表推理模板，不用日期、ID 或單純改名來假裝增加題型
- 每次抽 30 題；每構面 5 題（2 基礎 + 2 中等 + 1 進階）
- 每份測驗固定 30 個不同 semantic templates，同一 family 在單份 form 中最多 1 次（比 max 2 更嚴格）
- 最近 8 份 form 會優先避開相同 item ID；小型 verbal family/tier 若 fresh variants 用完才允許 controlled fallback
- 全庫 5,124 個唯一 content signatures

## QB4 任務家族

六個構面各 7 類：

- 語文理解：必要條件、報導與事實、轉折主旨、否定範圍、例外條款、指涉辨識、證據強度
- 流體推理：規則機器、次序約束、集合交集、符碼對照、守恆推理、配對限制、矩陣差值
- 視覺空間：方格位移、鏡面位置、方位旋轉、切割面積、堆疊遮擋、比例縮放、格線最短路
- 工作記憶：位置回憶、配對記憶、資訊更新、選擇性記憶、新舊辨認、相對位置、順序重組
- 處理速度：精確比對、目標計數、配對搜尋、條件篩選、順序掃描、首尾條件、缺項搜尋
- 量化推理：折扣、單位價格、平均補值、整除餘數、時刻推算、機率計數、等式求值

## 選項品質與答案位置

`answer-quality.js` 在 QB4 改成 audit-only：只檢查選項格式、唯一性、長度提示等風險，不改寫 QB4 題目、答案或 revision。

`answer-position-balance.js` 會以 deterministic hash + quota 平衡全庫正解位置：

`A/B/C/D = 1281 / 1281 / 1281 / 1281`

## Item Quality QA+

結果頁提供「題庫品質 QA+」。資料只存在目前瀏覽器 `localStorage`，不自動上傳，也不保存姓名或帳號。

QA+ 會累積／分析：曝光、答對率、跳過率、逾時率、平均作答時間與離散程度、distractor 選擇率、distractor efficiency、item-rest correlation、難度標籤落差、靜態 option cue 與答案位置平衡。

判讀門檻：`N < 10` 只累積；`N ≥ 20` 開始看 distractor efficiency；`N ≥ 30` 才顯示 item-rest discrimination。這仍是工程 QA，不等於 IRT 校準或正式 IQ 常模。

## 計時模型

- 語文理解／流體推理／視覺空間／量化推理：不限時
- 工作記憶：刺激只呈現一次；基礎 4 秒、中等 5 秒、進階 6 秒；消失後作答不限時
- 處理速度：18 秒明確倒數；倒數到 0 永久鎖定
- 顯示整份測驗總時間

4/5/6 秒是產品版呈現政策，不是臨床常模；目的是減少把閱讀速度混進工作記憶分數。

## UI / Single-Screen

- 暖米白／紙張奶油色／深墨棕／古銅色 editorial palette
- 首頁、單題測驗、結果摘要以一個 viewport 為主要舞台
- `100dvh`、safe-area、手機與短高度 breakpoint
- 詳細說明、逐題解析與 QA 使用 overlay
- 題目採 low-fatigue presentation：資訊只顯示一次；Matrix 保留必要視覺，其他題型以文字與答案為主
- 底部保留「上一題 / 下一題」導覽；逾時題回看仍鎖定，但可繼續前進

## 自動品質閘門

GitHub Actions 目前驗證：

- JavaScript syntax
- QB4 5,124-item bank 與 42 families
- 5,124 unique signatures
- 30-item form：6×5、2 easy + 2 medium + 1 hard、30 semantic templates
- recent-8 history persistence / fresh-first controlled fallback
- QB4 option audit + A/B/C/D 1281/1281/1281/1281
- Item Quality QA+ calculations
- QB4 low-fatigue presentation
- Adaptive memory exposure 4/5/6 秒
- Local item analytics
- Single-Screen UI、Matrix viewport safety、forward navigation

## 主要檔案

- `question-bank.js` — QB4 5,124-item generator / validator / form selector
- `answer-quality.js` — QB4 audit-only option cue preflight
- `answer-position-balance.js` — deterministic A/B/C/D balance
- `presentation-clarity.js` — QB4 low-fatigue presentation
- `memory-exposure.js` — 4/5/6 秒工作記憶刺激政策
- `item-quality-v2.js` — QA+ / item-rest / distractor efficiency / preflight
- `timeout-lock.js` — 混合計時、總時間、逾時鎖定
- `navigation-layout-fix.js` — 非破壞式上一題／下一題導覽
- `heritage-theme.css` — 暖米白／墨棕／古銅 active theme

## 重要限制

目前 `easy / medium / hard` 是設計難度，不是人口樣本校準後的 psychometric difficulty。`IQ-style Cognitive Index` 是網站實驗分數，不能視為正式 IQ、人口百分位或診斷結果。

> **不構成任何標準，好玩就好。** 內容僅供參考；若有出入，以你的想像力為準。
