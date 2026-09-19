# Cognitive IQ Lab — Product Status

Status date: **2026-09-19 Asia/Taipei**  
Release candidate: **RC-2026.09.19-11**  
Repository authority: **`main` remains formal authority; this branch is the proposed RC11 hard-only fluid-matrix change set**  
Branch base: `a390992fe1a1464a36995e718558da2ec0399601`

## Active product

- Product: cognitive playground / self-exploration
- Production bank: **2,058 items**
- Construct templates: **294**
- Task families: **42**
- Production form: **42 items = 6 domains × 7 families**
- Difficulty blueprint per domain: **2 easy + 3 medium + 2 hard**
- Public result: **clean qualitative title card + 30 deterministic directional combination titles**
- Title engine: **6 primary domains × 5 secondary domains = 30 unique combinations**
- Title selection: **deterministic; identical domain ordering yields identical title**
- Replay history: **internal/local continuity only; not shown on the public result surface**
- Replay comparison: **retained internally; no public replay strip**
- Keyboard access: **named question navigation, pressed/current states, question focus handoff, modal focus containment**
- Focus visibility: **explicit focus-visible + forced-colors support**
- Public six-domain view: **qualitative hexagon, no main/secondary text labels, no scale and no numeric values**
- Public sharing controls: **hidden; public result actions are 抽新題 / 逐題解析 / 校準 only**
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

RC10 is expected to preserve:

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
- replay history isolated in `replay-history.js`
- replay storage capped at 4 entries and limited to title/emoji/variant/domain identity only
- replay history stores no CPI, score, accuracy, answers, timing, demographics, or participant identifiers
- replay history never auto-uploads
- focusable question navigation is not hidden from assistive technology
- dynamic answer buttons expose `aria-pressed`; current question exposes `aria-current=step`
- question changes move focus to the new prompt without scrolling the page
- modal open/Tab/Escape/close behavior keeps focus contained and restores the opener
- external add/remove transfer items name the external actor and explicitly state when objects leave the counted system
- pairing-capacity items do not use irrelevant random-place prefixes
- 4×3 matrix tasks stay compact in the final Safari visual cascade
- review modal shows **your answer + correct answer + explanation** as separate fields
- public result exposes no copy/share controls; internal share text helper remains non-numeric
- six-domain public visualization is a qualitative hexagon with no score scale or main/secondary text labels
- direct-entry / no-practice validation
- single-screen / navigation / matrix viewport guards
- Jekyll production bundle render validation
- cache-busted RC assets: `20260919-rc11`

## Previous maintenance convergence

RC9 was the converged Safari cleanup baseline. RC10 was reopened after another play-through identified the route-following coordinate task as low-value and the result-page 主線索／副線索／今天的玩法 cards as unnecessary.

- `main` at RC9 remains the formal authority until this RC10 branch is merged.
- Repository size remains modest; frozen calibration / research evidence is retained for audit and reproducibility rather than deleted.
- Six frozen research workflows are path-scoped so ordinary product/UI-only changes do not re-run unrelated R/research validation.
- Product changes continue to be protected by Question Bank Validation, Product Release Candidate Gate, and Product Qualitative Result Guard.
- Research workflows still run whenever their calibration files, scripts, tests, or workflow definitions change.
- No scoring thresholds, governance locks, timing, title-selection logic, replay storage schema, or norming boundaries are changed; RC10 changes one production spatial task surface and removes redundant public result labels/cards only.

## Frozen research lineage

Calibration v13 / IRB / real-participant norming work remains preserved for research lineage but is **frozen** and does not block product development.

Historical calibration workflows and evidence remain reproducibility/audit records. They are not the active public-product authority.

## RC boundary

This is an engineering release candidate. It does **not** establish population reliability, criterion validity, IRT/CAT equating, clinical validity, IQ norms, or a validated brain-age model.

The playful title system deliberately avoids a public quantitative standard while keeping internal measurement diagnostics available for engineering and future research.

## RC10 delta

- Production `grid-displacement` surfaces no longer ask users to follow multi-segment arrows to calculate an endpoint coordinate; they are converted to static S/E relative-position questions with no route arrows.
- Public result removes the 主線索／副線索／今天的玩法 cards and the small directional signature badge.
- The six-domain hexagon keeps the six domain names and qualitative emphasis only; it no longer prints 主線／副線 role text.
- Scoring, timing, 42-item form structure, calibration data, replay storage schema and all IQ/norming governance locks remain unchanged.

## RC11 delta

- No new easy/medium matrix archetypes are added.
- Hard `matrix-difference` variant 7 becomes a 3×3 four-attribute matrix: shape, fill, arrow direction and dot count must all be solved together.
- Hard variant 8 becomes a 3×3 logical-composition matrix: symbol sets follow XOR while arrow direction follows a second composition rule.
- The hard items use plausible distractors that each preserve part of the pattern instead of obviously wrong alternatives.
- The 42-item blueprint remains 2 easy + 3 medium + 2 hard per domain; this change strengthens only the hard matrix surfaces and does not unlock any IQ/norming governance gate.
