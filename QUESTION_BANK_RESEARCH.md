# Question Bank Research Notes

研究日期：2026-09-10  
適用版本：Question Bank v3 / `QB-2026.09.3`

## 目的

Cognitive IQ Lab 的 300 題題庫不是把網路 IQ 題目大量複製進專案，而是研究公開的認知測驗、心理計量與 Automatic Item Generation（AIG）方法後，建立自己的受控原創題型模型。

核心原則：

1. 研究公開的方法、題型結構與測量概念。
2. 不複製受保護的正式測驗題目、答案、圖片、常模或專有計分。
3. 題庫題目保留穩定 ID、構面、難度、題型模型與版本 metadata。
4. 先建立大型題庫，再以真實答題資料進行題目分析與心理計量校準。
5. 題目數量本身不等於效度；300 題目前仍是未校準的原創工程題庫。

## 研究來源與採用概念

### 1. International Cognitive Ability Resource (ICAR)

ICAR 的早期工作提出可在線上施測、可公開研究的認知能力資源，並包含 Letter/Number Series、Matrix Reasoning、Verbal Reasoning、3D Rotation 等題型。University of Oregon 的 ICAR 資料頁記錄初始四類共 60 題，約 97,000 人接受隨機子集施測，也提到 automatic item generation。

來源：
- https://scholarsbank.uoregon.edu/items/d6795411-3b84-43b7-b256-7ac0e3c1b87e/full
- DOI: https://doi.org/10.5334/jopd.25

採用到本專案的概念：大型題庫、隨機／平衡抽題、矩陣／數列／語文／空間等通用構面，以及題目生成器思路。

### 2. ICAR 2026 PsychArchives package 的授權界線

PsychArchives 於 2026-06-02 公開的 ICAR tests / generators package 標示為 Scientific Use License；頁面也明確表示測驗材料主要供科學研究與教學，非科學用途不能直接存取使用。Readme 本身是 Public Use / CC BY 4.0，但完整測驗材料不是一般自由商用素材。

來源：
- https://psycharchives.org/en/item/be35b8b4-2bc7-4691-964d-52cfc1cf17a9
- DOI: https://doi.org/10.23668/psycharchives.22167

因此本專案只把 ICAR 當成方法與架構參考，不匯入其 2026 測驗題庫、scoring keys 或 generator 產出的受限制內容。

### 3. Automatic Item Generation（AIG）與圖形矩陣

Freund、Hofer、Holling 的研究顯示，figural matrix items 可以用明確的規則／參數以程式產生；研究中的自動生成矩陣題可用 Rasch model 分析，並且題目難度可部分由任務參數解釋。

來源：
- https://journals.sagepub.com/doi/10.1177/0146621607306972

採用到本專案的概念：不是手動複製大量矩陣題，而是用規則家族產生 isomorphic / parameterized items，並讓題型模型成為 metadata，方便後續分析同一模型的難度表現。

### 4. NIH Toolbox：大型題庫、IRT / CAT 與短測驗

NIH Toolbox Cognition Battery 使用現代心理計量方法，包括 Item Response Theory（IRT）與 Computer Adaptive Testing（CAT），重點不是要求受測者做完整母題庫，而是從大型題庫中選擇較有效率的題目形成較短測驗。

相關研究也展示大型 vocabulary candidate bank 經過樣本施測、Rasch / IRT 分析後篩選題目，而不是把所有候選題都當成同等品質。

參考：
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3954750/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4558909/

採用到本專案的概念：300 題是母題庫，每次仍只抽 30 題；未來應以真實資料校準題目參數，再考慮進一步改成 adaptive selection。

### 5. Item exposure control

ETS 對 computerized adaptive testing 的研究指出，連續電腦化施測需要控制特定題目被受測者看到的頻率，並可搭配 randomization / exposure control 方法保護題庫及降低重複曝光。

來源：
- https://www.ets.org/research/policy_research_reports/publications/report/1995/hxsf.html

採用到本專案的概念：Question Bank v3 在瀏覽器 localStorage 中保留最近 8 份題組的 item IDs，抽題時優先使用近期未出現題目。這是簡化的 exposure-control 機制，不等同正式 CAT 的 exposure-control 演算法。

### 6. 商業測驗材料保護

Pearson 的測驗安全／法律政策把 secured test materials 視為需要保護的專有材料。Raven、WAIS 等正式工具也有自己的測驗內容與計分規範。

參考：
- https://www.pearsonassessments.com/footer/legal-policies.html

因此 Cognitive IQ Lab 不會把正式 WAIS、Stanford–Binet、Raven / Pearson 題目、答案或常模抓進題庫。名稱如「Raven-like」僅描述抽象矩陣推理的通用互動形式；實際內容必須保持原創。

## Question Bank v3 設計

母題庫：300 題。

- 語文理解：50
- 流體推理：50
- 視覺空間：50
- 工作記憶：50
- 處理速度：50
- 量化推理：50

每構面難度配置：

- easy：20
- medium：20
- hard：10

每次測驗抽題配置：

- 每構面 5 題
- easy：2
- medium：2
- hard：1
- 6 構面合計 30 題

時間規則：

- 語文理解：不限時
- 流體推理：不限時
- 視覺空間：不限時
- 工作記憶：刺激短暫呈現，回答不限時
- 處理速度：限時
- 量化推理：不限時

## Runtime validation

`question-bank.js` 在瀏覽器執行時會檢查：

- 題庫是否為 300 題
- item ID 是否唯一
- 每題是否屬於合法構面
- difficulty 是否合法
- 是否有 4 個互不重複的選項
- 答案 index 是否有效
- matrix 是否有 9 格
- 只有處理速度題可帶硬性 `limit`
- 每構面是否正好 50 題
- 每構面難度是否為 20 / 20 / 10

驗證結果公開於 `window.IQ_BANK_VALIDATION`，題庫 metadata 位於 `window.IQ_BANK_META`。

## 下一階段：真正校準，而不是單純再加題

300 題之後，最重要的工作不再是把題目增加到 500 或 1000，而是蒐集匿名答題資料後分析：

- 每題通過率 / empirical difficulty
- item-total correlation / discrimination
- distractor functioning
- 作答時間分布
- 各題型模型是否產生過度相似題
- reliability
- construct validity
- differential item functioning / bias
- age-group invariance
- IRT / Rasch item parameters
- 題庫淘汰、修訂與版本控制

只有完成這些實證步驟後，才有理由把設計標籤 `easy / medium / hard` 升級成真正的心理計量難度，並進一步討論百分位或標準分數。
