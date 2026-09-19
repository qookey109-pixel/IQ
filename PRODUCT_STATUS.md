# Cognitive IQ Lab — Product Status

Status date: **2026-09-19 Asia/Taipei**  
Release candidate: **RC-2026.09.19-3**  
Repository authority: **current `main` after merge; this branch is the proposed RC2 change set**  
Branch base: `52272ddfd61127ea133fbd5f718b7b528efa9c6a`

## Active product

- Product: cognitive playground / self-exploration
- Production bank: **2,058 items**
- Construct templates: **294**
- Task families: **42**
- Production form: **42 items = 6 domains × 7 families**
- Difficulty blueprint per domain: **2 easy + 3 medium + 2 hard**
- Public result: **qualitative playful title + attempt-specific cues**
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

Instead, the result page converts the relative shape of the current attempt into a playful title such as **規律捕手、空間導航員、文字解碼師、記憶收藏家、閃電掃描員、數字拆解師** or **多線探索者**.

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

RC2 is expected to preserve:

- 2,058-item / 42-item production validation
- independent answer oracle and answer-position balance
- 42-item single-spec guard
- internal Scoring v2 boundary validation
- Measurement Hardening v1
- timing deadline / timeout regression
- no pseudo-IQ fallback
- qualitative-result public-surface guard
- direct-entry / no-practice validation
- single-screen / navigation / matrix viewport guards
- Jekyll production bundle render validation
- cache-busted RC assets: `20260919-rc3`

## Frozen research lineage

Calibration v13 / IRB / real-participant norming work remains preserved for research lineage but is **frozen** and does not block product development.

Historical calibration workflows and evidence remain reproducibility/audit records. They are not the active public-product authority.

## RC boundary

This is an engineering release candidate. It does **not** establish population reliability, criterion validity, IRT/CAT equating, clinical validity, IQ norms, or a validated brain-age model.

The playful title system deliberately avoids a public quantitative standard while keeping internal measurement diagnostics available for engineering and future research.
