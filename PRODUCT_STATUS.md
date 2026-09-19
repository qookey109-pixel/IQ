# Cognitive IQ Lab — Product Status

Status date: **2026-09-19 Asia/Taipei**  
Release candidate: **RC-2026.09.19-5**  
Repository authority: **`main` remains formal authority; this branch is the proposed RC5 combination-title change set**  
Branch base: `4777adcbaf98a9dde62ed0868d7a1e8288254349`

## Active product

- Product: cognitive playground / self-exploration
- Production bank: **2,058 items**
- Construct templates: **294**
- Task families: **42**
- Production form: **42 items = 6 domains × 7 families**
- Difficulty blueprint per domain: **2 easy + 3 medium + 2 hard**
- Public result: **share-friendly qualitative title card + 30 deterministic directional combination titles**
- Title engine: **6 primary domains × 5 secondary domains = 30 unique combinations**
- Title selection: **deterministic; identical domain ordering yields identical title**
- Public six-domain view: **role-only constellation (主線／副線), no scale and no numeric values**
- Public sharing: **copy/share qualitative text only; no internal score is included**
- Public numeric score: **none**
- Public age input: **none**
- Public practice questions: **none**
- Entry flow: **homepage → 42-item formal assessment**
- Internal scoring engine: **Scoring v2 / CPI 0–100**, retained only for engineering consistency, QA, and research lineage
- Processing-speed refinement: retained internally; not shown as a public score

## Public experience boundary

The result page does **not** publish:

- CPI or any other total score
- IQ conversion
- population percentile
- age-peer ranking
- brain-age / cognitive-age number
- diagnostic, educational-placement, or employment conclusions

Instead, the result page maps the two most prominent directions of the current attempt into one of **30 directional combination titles**. Examples include **論點拼圖師、結構偵探、腦內製圖師、快閃記錄員、快速估算手**. The same relative ordering always produces the same title.

These titles describe only this attempt. They are not a calibrated ability level, personality type, or population comparison.

## Product governance locks

These remain closed:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`
- `iqConversionEnabled=false`
- `populationPercentileAvailable=false`

Public-result metadata additionally requires:

- `publicResultMode='qualitative-playful'`
- `publicScoreVisible=false`
- `publicQuantitativeStandard=false`
- `ageInputRequired=false`
- `practiceEnabled=false`
- `practiceCount=0`

## Release-candidate evidence

RC5 is expected to preserve:

- 2,058-item / 42-item production validation
- independent answer oracle and answer-position balance
- 42-item single-spec guard
- internal Scoring v2 boundary validation
- Measurement Hardening v1
- timing deadline / timeout regression
- no pseudo-IQ fallback
- qualitative-result public-surface guard
- 30/30 directional title-combination coverage and uniqueness
- deterministic title selection with a stable tie-break order
- title mapping isolated in `result-title-engine.js` rather than embedded in the result renderer
- share text contains no CPI / IQ / percentile / numeric ability output
- six-domain public visualization is role-only and has no score scale
- direct-entry / no-practice validation
- single-screen / navigation / matrix viewport guards
- Jekyll production bundle render validation
- cache-busted RC assets: `20260919-rc5`

## Frozen research lineage

Calibration v13 / IRB / real-participant norming work remains preserved for research lineage but is **frozen** and does not block product development.

Historical calibration workflows and evidence remain reproducibility/audit records. They are not the active public-product authority.

## RC boundary

This is an engineering release candidate. It does **not** establish population reliability, criterion validity, IRT/CAT equating, clinical validity, IQ norms, or a validated brain-age model.

The playful title system deliberately avoids a public quantitative standard while keeping internal measurement diagnostics available for engineering and future research.
