# Cognitive IQ Lab v6

Cognitive IQ Lab 是一個原創、多構面的 IQ-style 認知測驗網站。定位是認知遊戲／自我探索工具，不是臨床、教育或就業用的正式智力鑑定。

## Question Bank v5.0

目前題庫版本：`QB-2026.09.5`，revision：`5.0`。

- 5,124 個題庫項目
- 6 個認知構面、42 個 task families
- 294 個 semantic / reasoning templates
- 語文理解：每個 family 2 個 reasoning archetypes，共 14 templates
- 其他五構面：每個 family 8 個 construct variants，共 280 templates
- 5,124 個具體題目 signatures 全部唯一
- 受控數字／自然情境變體不會被灌水成新的 `semanticKey`
- 每次抽 30 題；每構面 5 題（2 基礎 + 2 中等 + 1 進階）
- 同一構面每份 form 使用 5 個不同 task families
- 最近 8 份 form 優先避開相同 item ID

## QB5 的主要升級

QB5 不再把「同一模板換數字」當成真正的題型多樣性，而是把規則層拆開。

### Construct expansion

- 42 families → 294 reasoning templates
- `semanticKey` 表示真正的規則模板，例如 `family:v1`、`family:v2`
- `surfaceVariant` 只表示自然情境／參數實例，不會增加 semantic-template 統計
- 5,124 個具體題目仍保持完全不同，避免實際抽到逐字相同的題目

### 難度分層

非語文題的難度直接綁定 construct variant：

- v1–v3：基礎
- v4–v6：中等
- v7–v8：進階

除此之外，部分 family 會真正提高認知負荷，例如：

- 工作記憶：刺激跨度／操作數增加
- 次序約束：元素與約束數增加
- 格線最短路：搜尋空間與障礙增加
- 字串速度題：掃描長度增加
- Matrix：規則會變，不只換數字，而且題幹不直接洩漏規則

這些仍是**設計難度**，不是人口校準後的 psychometric difficulty。

## Form Equivalence v1

QB5 現在不只固定題數與難度配額，也對抽卷做一層設計負荷匹配。

- 仍固定 6 構面 × 5 題
- 每構面固定 2 easy + 2 medium + 1 hard
- 每構面 5 個不同 family
- 每題計算 `formLoad` 設計負荷，考慮難度、題幹長度、工作記憶跨度、空間搜尋範圍與約束量等
- 每次建立 64 份合法候選 form，再選擇六構面負荷最接近目標的一份
- CI 會對多份 form 驗證 residual load deviation guardrail

這是工程層的 form-equivalence guardrail，不是正式 psychometric equating。

## Scoring v2

結果頁不再把表現直接映射成類 IQ 的 70–130 區間。

目前顯示：

**Cognitive Performance Index：0–100**

規則：

- 同時保留原始正確率，不讓單一指數取代原始資料
- easy / medium / hard 權重分別為 `1.0 / 1.25 / 1.5`
- 一般構面以難度加權正確率為主要分數
- 處理速度只有在答對後，速度效率才影響最後 5%
- 快速答錯不會得到速度加分
- `IQ_LAST_RESULT` 明確標記 `calibrated: false`

這個 0–100 指數仍是產品實驗分數，不是 IQ、人口百分位或常模分數。

## Oracle Validation v1

除了結構檢查，CI 現在有第二套 reference solver，獨立重新計算全題庫正解。

目前 quality gate 會：

- 對 5,124 / 5,124 題重新計算 expected answer
- 覆蓋全部 42 task families
- 覆蓋全部 294 semantic templates
- 驗證 oracle answer = `correctContent`
- 再驗證 answer-position balance 後的 `o[a]` 仍等於 oracle answer

這可以抓出「生成器題目與答案一起寫錯、但結構檢查仍通過」的錯誤類型。

## 六大構面

六個構面各 7 類：

- 語文理解：必要條件、報導與事實、轉折主旨、否定範圍、例外條款、指涉辨識、證據強度
- 流體推理：規則機器、次序約束、集合交集、符碼對照、守恆推理、配對限制、矩陣規則
- 視覺空間：方格位移、鏡面位置、方位旋轉、切割面積、立方體表面、比例縮放、障礙格線最短路
- 工作記憶：位置回憶、配對記憶、資訊更新、選擇性記憶、新舊辨認、相對位置、順序重組
- 處理速度：精確比對、目標計數、配對搜尋、條件篩選、順序掃描、首尾條件、缺項搜尋
- 量化推理：折扣、單位價格、平均補值、整除餘數、時刻推算、機率計數、等式求值

## 視覺空間

QB5 不再讓視覺空間主要依賴純文字算術：

- 1,008 / 1,008 視覺空間題都有 inline SVG 題目圖示
- 位移、鏡射、方位、裁切、立方體表面、縮放、路徑都有對應圖形
- 最短路題包含不同障礙配置，要求真正搜尋路徑
- Matrix 題保留必要的 3×3 視覺結構，規則只在作答後解析中揭示

## 選項品質與答案位置

QB5 仍保留 option-quality audit，並在所有題目構造完成後做 deterministic answer-position balancing。

全庫正解位置：

`A/B/C/D = 1281 / 1281 / 1281 / 1281`

所有題目維持 4 個不同選項；明顯不可能的 distractor、最長即正解等先前問題已在 QB4 Clarity / Option Quality 階段處理，QB5 延續這些原則。

## Item Quality QA+

結果頁提供「題庫品質 QA+」。資料只存在目前瀏覽器 `localStorage`，不自動上傳，也不保存姓名或帳號。

QA+ 會累積／分析：曝光、答對率、跳過率、逾時率、平均作答時間與離散程度、distractor 選擇率、distractor efficiency、item-rest correlation、難度標籤落差、靜態 option cue 與答案位置平衡。

判讀門檻：`N < 10` 只累積；`N ≥ 20` 開始看 distractor efficiency；`N ≥ 30` 才顯示 item-rest discrimination。這仍是工程 QA，不等於 IRT 校準或正式 IQ 常模。

## Calibration Readiness v1

結果頁現在也提供「校準準備度」。目的不是提前宣稱題庫已校準，而是把未來做 pilot / psychometric study 需要的資料結構先準備好。

本機會保存最多 500 個 session 的匿名／假名化研究資料：

- 每題只保存 item ID、family、`semanticKey`、difficulty
- 保存 0/1 正誤、是否跳過、是否逾時、作答秒數
- 保存每次 Cognitive Performance Index、原始正確率與 form-load deviation
- 不保存作答選項文字或 answer index
- 不保存姓名、帳號、IP、位置
- 不會自動上傳；只有使用者主動按「匯出校準快照 JSON」才會產生檔案
- 本機 `sourceKey` 只用於日後自願合併匯出檔時去重，不代表真實身分

Readiness 會顯示：

- 本機 session 數
- 5,124 題 item coverage
- 294 semantic-template coverage
- 42 family coverage
- 達 `N≥10` / `N≥30` 的題目數
- CPI 平均、SD、floor / ceiling share
- easy / medium / hard 的實際答對率
- form-load deviation
- QA+ 的平均 item-rest 與 distractor efficiency（資料足夠時）

**硬規則：同一瀏覽器重複完成 100 次，也不能當成 100 位獨立受測者。** `formalCalibrationReady` 永遠保持 `false`，直到未來有明確的獨立受測者 protocol、人口分層、IRT/CAT、信度與效度研究。

## 計時模型

- 語文理解／流體推理／視覺空間／量化推理：不限時
- 工作記憶：刺激只呈現一次；基礎 4 秒、中等 5 秒、進階 6 秒；消失後作答不限時
- 處理速度：18 秒明確倒數；倒數到 0 永久鎖定
- 顯示整份測驗總時間

## UI / Single-Screen

- 暖米白／紙張奶油色／深墨棕／古銅色 editorial palette
- 首頁、單題測驗、結果摘要以單一 viewport 為主要舞台
- `100dvh`、safe-area、手機與短高度 breakpoint
- 詳細說明、逐題解析與 QA 使用 overlay
- 底部保留「上一題 / 下一題」導覽；逾時題回看仍鎖定，但可繼續前進

## 自動品質閘門

GitHub Actions 目前驗證：

- JavaScript syntax
- QB5 5,124-item bank / 42 families / 294 semantic templates
- 5,124 unique concrete item signatures
- 5,124 / 5,124 independent oracle answers
- 30-item form：6×5、2 easy + 2 medium + 1 hard、每構面 5 個不同 family
- 64-candidate form-equivalence design-load matching
- recent-8 history persistence
- exact A/B/C/D balance = 1281/1281/1281/1281
- Scoring v2 0–100 scale / raw accuracy preservation / correct-only speed contribution
- Calibration Readiness v1 local-only session matrix / coverage phases / privacy guardrails / no false calibration claim
- construct-linked difficulty
- Matrix 題幹不洩漏推理規則
- 工作記憶跨度與操作負荷
- 1,008 spatial SVG items
- Item Quality QA+
- Local item analytics
- Single-Screen UI、Matrix viewport safety、forward navigation
- 完整 QB5 JSON / items JSON / CSV export artifact

## 主要檔案

- `question-bank.js` — 5,124-item base generator
- `qb5-core.js` — QB5 construct metadata / handler core
- `qb5-verbal.js` — 語文 reasoning archetypes
- `qb5-fluid.js` — 流體推理 construct variants
- `qb5-spatial.js` — 視覺空間 construct variants + SVG
- `qb5-memory.js` — 工作記憶 variants
- `qb5-speed.js` — 處理速度 variants
- `qb5-quant.js` — 量化 variants
- `qb5-parameter-diversity.js` — 不灌水 semanticKey 的受控具體變體
- `qb5-ordering-diversity-fix.js` — 排序族自然情境唯一化
- `qb5-form-equivalence.js` — formLoad 與 64-candidate load matching
- `qb5-finalize.js` — 全庫驗證與 30 題 form selector
- `scoring-v2.js` — 0–100 Cognitive Performance Index
- `calibration-readiness.js` — local-only calibration preparation / export snapshot
- `assessment-quality.js` — 單次記憶呈現與 Scoring v2 結果整合
- `tests/qb5-oracle-validation.js` — 42-family independent reference solver
- `tests/calibration-readiness-validation.js` — calibration-readiness privacy / phase / false-calibration guard
- `answer-position-balance.js` — deterministic A/B/C/D balance
- `item-quality-v2.js` — QA+ / item-rest / distractor efficiency
- `memory-exposure.js` — 4/5/6 秒工作記憶刺激政策
- `timeout-lock.js` — 混合計時、總時間、逾時鎖定
- `heritage-theme.css` — 暖米白／墨棕／古銅 active theme

## 重要限制

QB5 已經把「模板多樣性、實際題目重複、視覺空間圖形化、設計難度負荷、抽卷等值 guardrail、答案 oracle、透明評分、校準資料準備」往前推進，但仍然沒有做人口樣本校準、IRT／CAT、reliability、criterion validity 或臨床效度驗證。

因此 `Cognitive Performance Index` 是 0–100 的網站實驗性表現指數，不能視為正式 IQ、人口百分位、教育／就業判斷或診斷結果。

> **不構成任何標準，好玩就好。**
