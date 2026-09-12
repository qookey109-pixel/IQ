# Cognitive IQ Lab v6

Cognitive IQ Lab 是一個原創、多構面的 IQ-style 認知測驗網站。定位是認知遊戲／自我探索工具，不是臨床、教育或就業用的正式智力鑑定。

## Question Bank v5.0

目前題庫版本：`QB-2026.09.5`，revision：`5.0`，自然語言層：`NL-2026.09.2`。

- 5,124 個題庫項目
- 6 個認知構面、42 個 task families
- 294 個 semantic / reasoning templates
- 5,124 個具體題目 signatures 全部唯一
- 1,008 / 1,008 視覺空間題都有 inline SVG
- 每次抽 30 題；每構面 5 題（2 基礎 + 2 中等 + 1 進階）
- 同一構面每份 form 使用 5 個不同 task families
- 最近 8 份 form 優先避開相同 item ID

## Natural Language v2

Natural Language v2 的目標是「題意清楚，但不要像模板機器」。不改答案邏輯、選項、難度或 semanticKey。

- `machine-composition` 改成簡潔的 X / 代數表示，不再使用冗長的「規則機器」敘述
- `scope-negation` 拿掉「在書店／車站的紀錄中」等無關前綴，改成直接問哪一句邏輯等價
- `invariant-transfer` 改成自然的甲／乙／丙容器與移動敘述
- `quant-unit-rate` 直接把信封、卡片、筆記本等物品寫進題句，不再使用「以○○這組資料為情境」
- `quant-remainder`、`quant-time`、`quant-probability`、`quant-balance` 共 576 題也完成相同去模板化處理
- 改寫後仍保持 5,124 / 5,124 concrete signatures 唯一
- 若某種表面前綴直接移除會造成重複，改用自然的物品、作業名稱或代碼變體，而不是靠無關場景灌唯一性

## Safari / 視覺空間修正

Safari 在 single-screen CSS grid 中可能把只有 `viewBox` 的 inline SVG 壓成接近 min-content 的窄條，看起來像「只有一個小空框」。

目前修正：

- 1,008 個 spatial SVG 都補上 intrinsic `width="360" height="220"`
- 保留 `viewBox` 與 `preserveAspectRatio="xMidYMid meet"`
- `spatial-visual-fix.css` 提供 responsive width / max-height 與 Safari-safe grid sizing
- 立方體柱、格線位移、鏡射、方位、裁切、縮放、最短路圖都走同一套 sizing guardrail

## Construct expansion

QB5 不再把「同一模板換數字」當成真正的題型多樣性：

- 42 families → 294 reasoning templates
- 語文每 family 2 reasoning archetypes，共 14 templates
- 其他五構面每 family 8 construct variants，共 280 templates
- `semanticKey` 表示規則模板；`surfaceVariant` 只表示自然情境／參數實例

非語文題的設計難度綁定 construct variant：v1–v3 基礎、v4–v6 中等、v7–v8 進階。工作記憶跨度、次序約束元素、格線搜尋空間與速度題掃描長度也會隨 tier 增加。這些仍是設計難度，不是人口校準後的 psychometric difficulty。

## Form Equivalence v1

- 固定 6 構面 × 5 題
- 每構面 2 easy + 2 medium + 1 hard
- 每構面 5 個不同 family
- 每題計算 `formLoad`
- 每次建立 64 份合法候選 form，再選擇六構面設計負荷最接近目標的一份

這是工程層 form-equivalence guardrail，不是正式 psychometric equating。

## Scoring v2

結果頁使用 **Cognitive Performance Index：0–100**，不再映射成類 IQ 的 70–130。

- 同時保留原始正確率
- easy / medium / hard 權重為 `1.0 / 1.25 / 1.5`
- 處理速度只有答對後，速度效率才影響最後 5%
- 快速答錯不會得到速度加分
- `calibrated: false`

## Oracle Validation v1

CI 使用另一套 reference solver，獨立重新計算 5,124 / 5,124 題正解，覆蓋全部 42 families 與 294 semantic templates，再確認 answer-position balancing 後的 `o[a]` 仍等於 oracle answer。

## Calibration Readiness v1

結果頁提供「校準準備度」，只把未來 pilot / psychometric study 需要的資料結構先準備好，不宣稱已校準。

本機最多保存 500 個 session：item ID、family、semanticKey、difficulty、0/1 正誤、skip、timeout、response seconds、CPI 與 form-load deviation。不保存姓名、帳號、IP、位置或選項文字，也不會自動上傳；只有使用者主動匯出 JSON。

**同一瀏覽器重複完成很多次，不會被視為很多位獨立受測者。** `formalCalibrationReady` 維持 `false`，直到未來有獨立受測者 protocol、人口分層、IRT/CAT、信度與效度研究。

## 計時模型

- 語文理解／流體推理／視覺空間／量化推理：不限時
- 工作記憶：刺激只呈現一次；基礎 4 秒、中等 5 秒、進階 6 秒；消失後作答不限時
- 處理速度：18 秒倒數；到 0 永久鎖定
- 顯示整份測驗總時間

## 自動品質閘門

GitHub Actions 目前驗證：

- JavaScript syntax
- 5,124 items / 42 families / 294 semantic templates
- 5,124 unique concrete signatures
- 5,124 / 5,124 independent oracle answers
- Natural Language v2 去模板化與 5,124 唯一性
- 1,008 個 Safari-safe spatial SVG intrinsic sizes
- 30-item form quota / family diversity / 64-candidate form-load matching
- A/B/C/D = 1281 / 1281 / 1281 / 1281
- Scoring v2
- Calibration Readiness v1 privacy / anti-false-calibration guardrails
- construct-linked difficulty
- Item Quality QA+ / local analytics
- memory exposure / single-screen / matrix viewport / navigation
- 完整 QB5 JSON / items JSON / CSV export artifact

## 主要檔案

- `question-bank.js` — base generator
- `qb5-core.js` / `qb5-*.js` — QB5 construct variants
- `qb5-parameter-diversity.js` — controlled surface variants
- `qb5-form-equivalence.js` — formLoad / 64-candidate matching
- `qb5-finalize.js` — QB5 finalization + Natural Language v1
- `natural-language-v2.js` — transactional de-templating + Safari SVG intrinsic sizing
- `spatial-visual-fix.css` — Safari-safe spatial rendering
- `scoring-v2.js` — 0–100 Cognitive Performance Index
- `calibration-readiness.js` — local calibration-readiness sessions
- `tests/qb5-oracle-validation.js` — independent answer oracle
- `tests/natural-language-validation.js` — language / uniqueness / SVG sizing guardrail

## 重要限制

QB5 已改善 construct diversity、題目唯一性、視覺空間呈現、題幹自然度、抽卷負荷、答案 oracle、透明評分與校準資料準備，但仍沒有做人口樣本常模、IRT／CAT、reliability、criterion validity 或臨床效度驗證。

因此 `Cognitive Performance Index` 仍是 0–100 的網站實驗性表現指數，不能視為正式 IQ、人口百分位、教育／就業判斷或診斷結果。

> **不構成任何標準，好玩就好。**
