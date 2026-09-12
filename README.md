# Cognitive IQ Lab v6

Cognitive IQ Lab 是一個原創、多構面的 IQ-style 認知測驗網站。定位是認知遊戲／自我探索工具，不是臨床、教育或就業用的正式智力鑑定。

## Question Bank v5.0

目前題庫版本：`QB-2026.09.5`，revision：`5.0`，自然語言層：`NL-2026.09.3`。

- 5,124 個題庫項目
- 6 個認知構面、42 個 task families
- 294 個 semantic / reasoning templates
- 5,124 個具體題目 signatures 全部唯一
- 1,008 / 1,008 視覺空間題都有 inline SVG
- 每次抽 30 題；每構面 5 題（2 基礎 + 2 中等 + 1 進階）
- 同一構面每份 form 使用 5 個不同 task families
- 最近 8 份 form 優先避開相同 item ID

## Natural Language v3

Natural Language v3 的目標是：**邏輯不變、題目直接、繁體中文自然，而且不要像模板機器。**

語言層參考 `Raymondhou0917/speak-human-tw` v1.4.0 的編輯原則，採用「先保住事實／邏輯，再移除模板味，最後做台灣語感校正」的方向；本專案只套用適合認知測驗的部分，沒有 runtime dependency，也不為了「人味」加入原題沒有的故事、情緒或條件。

目前原則：

- **答案與構念優先**：改寫不得改變正解、semanticKey、難度或真正要測的推理規則
- **直接問**：`machine-composition` 使用簡潔 X／代數表示，不再用「規則機器」包裝簡單運算
- **情境必須有作用**：移除「在書店的紀錄中」「以○○這組資料為情境」「在○○的快速掃描組中」等裝飾性前綴
- **邏輯題保留精度**：否定範圍仍明確使用「邏輯相同／等價」，不因口語化變得模糊
- **自然量詞**：例如「150 封信件、每分鐘製作幾封」，不再把具體物品又問成「幾件」
- **工作記憶短指令**：刺激消失後只留下必要操作，不重述整段資訊
- **處理速度靠真實刺激做差異**：Concrete uniqueness 改由符號、數字、代碼與 distractor 變化維持，不靠無關地點故事
- **台灣繁體中文**：固定檢查常見台灣用語與全形中文標點
- **不假裝有人味**：專業題目可以專業；只清掉模板化與翻譯腔，不亂加口頭禪

完整規範見 `docs/question-language-style.md`。

### 已處理的代表題型

- `machine-composition`：`X = 9，求 (X + 2) × 3。`
- `scope-negation`：直接問「不是所有完成 A 的人都完成 B」哪一句與原句等價
- `invariant-transfer`：改成甲／乙／丙容器與清楚的移動動作
- `quant-unit-rate`：物品與量詞直接進入題句
- `quant-remainder` / `quant-time` / `quant-probability` / `quant-balance`：共 576 題移除假情境前綴
- `set-overlap` / `pairing-capacity`：使用真正參與推理的分類、鎖／鑰匙、座位、容量等名詞
- `memory-update` / `memory-relative` / `memory-reorder`：縮短作答階段的指令
- `speed-count` / `speed-parity` / `speed-order` / `speed-missing`：直接呈現掃描任務，不再靠「某地的快速掃描組」維持唯一性

改寫後仍保持 **5,124 / 5,124 concrete signatures 唯一**，並且 **5,124 / 5,124 題仍通過獨立 answer oracle**。

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
- Natural Language v3：zero artificial wrappers、台灣用語、題幹長度 guardrails、5,124 唯一性
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
- `qb5-finalize.js` — QB5 finalization + base natural-language reconstruction
- `natural-language-v2.js` — 檔名為相容性保留；目前實作 Natural Language v3 主語言層
- `question-language-finalize.js` — 最後語感／量詞／速度題唯一性整理，執行於答案位置平衡之前
- `docs/question-language-style.md` — 題目繁中語意與台灣用語規範
- `spatial-visual-fix.css` — Safari-safe spatial rendering
- `scoring-v2.js` — 0–100 Cognitive Performance Index
- `calibration-readiness.js` — local calibration-readiness sessions
- `tests/qb5-oracle-validation.js` — independent answer oracle
- `tests/natural-language-validation.js` — Natural Language v3 / uniqueness / Taiwan terminology / stem-length / SVG guardrail

## 重要限制

QB5 已改善 construct diversity、題目唯一性、視覺空間呈現、題幹自然度、抽卷負荷、答案 oracle、透明評分與校準資料準備，但仍沒有做人口樣本常模、IRT／CAT、reliability、criterion validity 或臨床效度驗證。

因此 `Cognitive Performance Index` 仍是 0–100 的網站實驗性表現指數，不能視為正式 IQ、人口百分位、教育／就業判斷或診斷結果。

> **不構成任何標準，好玩就好。**
