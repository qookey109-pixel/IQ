# Question Bank Research Notes

研究日期：2026-09-10  
適用版本：Question Bank v3.1 / `QB-2026.09.3`

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

PsychArchives 於 2026-06-02 公開的 ICAR tests / generators package 標示為 Scientific Use License；完整測驗材料不是一般自由商用素材。

來源：
- https://psycharchives.org/en/item/be35b8b4-2bc7-4691-964d-52cfc1cf17a9
- DOI: https://doi.org/10.23668/psycharchives.22167

因此本專案只把 ICAR 當成方法與架構參考，不匯入其測驗題庫、scoring keys 或受限制內容。

### 3. Automatic Item Generation（AIG）與圖形矩陣

Freund、Hofer、Holling 的研究顯示，figural matrix items 可以用明確規則／參數以程式產生；研究中的自動生成矩陣題可用 Rasch model 分析，並且題目難度可部分由任務參數解釋。

來源：
- https://journals.sagepub.com/doi/10.1177/0146621607306972

採用到本專案的概念：使用規則家族產生 parameterized items，並讓題型模型成為 metadata，方便後續分析同一模型的難度表現。

### 4. NIH Toolbox：大型題庫、IRT / CAT 與短測驗

NIH Toolbox Cognition Battery 使用現代心理計量方法，包括 Item Response Theory（IRT）與 Computer Adaptive Testing（CAT）。大型候選題庫需要經樣本施測與心理計量分析後篩選，而不是把所有候選題視為同等品質。

參考：
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3954750/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4558909/

採用到本專案的概念：300 題是母題庫，每次仍只抽 30 題；未來應以真實資料校準題目參數，再考慮 adaptive selection。

### 5. Item exposure control

ETS 對 computerized adaptive testing 的研究指出，連續電腦化施測需要管理題目曝光，可搭配 randomization / exposure control 方法保護題庫及降低重複曝光。

來源：
- https://www.ets.org/research/policy_research_reports/publications/report/1995/hxsf.html

Question Bank v3.1 除了保留最近 8 份題組的曝光紀錄，也加入完整 coverage cycle。以目前每構面固定 2 easy / 2 medium / 1 hard 的組卷比例，前 10 份 30 題表單可以先完整走過 300 題，再開始下一輪重複。這仍是簡化的曝光控制，不等同正式 CAT exposure-control 演算法。

### 6. 商業測驗材料保護

Pearson 的測驗安全／法律政策把 secured test materials 視為需要保護的專有材料。Raven、WAIS 等正式工具也有自己的測驗內容與計分規範。

參考：
- https://www.pearsonassessments.com/footer/legal-policies.html

因此 Cognitive IQ Lab 不會把正式 WAIS、Stanford–Binet、Raven / Pearson 題目、答案或常模抓進題庫。實際內容保持原創。

## Question Bank v3.1 設計與 QA

母題庫：300 題。

- 語文理解：50
- 流體推理：50
- 視覺空間：50
- 工作記憶：50
- 處理速度：50
- 量化推理：50

每構面難度配置：20 easy / 20 medium / 10 hard。

每次測驗：每構面 5 題，2 easy / 2 medium / 1 hard，合計 30 題。

v3.1 額外完成：

- 300 個 task signature 全部唯一，避免只換 ID 卻實際重複相同題面。
- 改善流體推理、視覺空間、工作記憶與處理速度生成參數的覆蓋範圍。
- 工作記憶刺激在一次測驗中只呈現一次；回到舊題不會重新取得刺激資訊。
- 處理速度的速度加分只在答案正確時成立，避免「答錯但很快」仍獲得速度分。
- 完整 coverage cycle：目前固定組卷比例下，前 10 份表單可覆蓋全部 300 題而不重複。
- GitHub Actions 自動檢查 JavaScript 語法與題庫結構，防止後續更新退化。

## 時間規則

- 語文理解：不限時
- 流體推理：不限時
- 視覺空間：不限時
- 工作記憶：刺激呈現 3 秒、回答不限時、刺激不可重播
- 處理速度：限時；逾時鎖定；只有答對時速度才加分
- 量化推理：不限時

## Runtime / CI validation

`question-bank.js` 與 `tests/question-bank-validation.js` 會檢查：

- 題庫必須正好 300 題
- item ID 必須唯一
- task signature 必須 300 / 300 唯一
- 每題必須屬於合法構面與難度
- 每題必須有 4 個互不重複選項
- 答案 index 必須有效
- matrix 題必須有 9 格
- 只有處理速度題可帶硬性 `limit`
- 每構面必須正好 50 題
- 每構面難度必須為 20 / 20 / 10
- 每份 30 題表單必須保持六構面各 5 題與 2 / 2 / 1 難度比例
- 模擬前 10 份表單時，應完整覆蓋 300 題且不重複

GitHub Actions workflow：`.github/workflows/question-bank-validation.yml`。

## 還沒有被「檢查通過」的部分

目前 QA 能證明的是工程結構、題目生成規則、組卷與互動邏輯沒有已知的結構性錯誤；它不能證明這 300 題具有正式心理測驗的效度。

下一階段需要真實受測資料才能分析：

- 每題通過率 / empirical difficulty
- item-total correlation / discrimination
- distractor functioning
- 作答時間分布
- 題型模型是否過度相似
- reliability
- construct validity
- differential item functioning / bias
- age-group invariance
- IRT / Rasch item parameters
- 題庫淘汰、修訂與版本控制

只有完成這些實證步驟後，才有理由把設計標籤 `easy / medium / hard` 升級成真正的心理計量難度，並進一步討論百分位或標準分數。
