# Cognitive IQ Lab — Calibration Pipeline

This directory defines the research pipeline required before Cognitive IQ Lab may report an IQ estimate.

## Core rule

CPI is the current product score. It must not be relabeled or algebraically converted into IQ. An IQ estimate is only unlocked after pooled, consented data support age-normed calibration, reliability, validity, fairness, and score-linking evidence.

## Pipeline

1. **Collect** — export pseudonymous item-level response data from the browser. Whole-year age only; no birthday, name, account, IP, or location.
2. **Pool** — combine voluntary exports while deduplicating the same browser/source key. Repeated sessions are not treated as independent people.
3. **Matrix sampling** — optional research mode maps each pseudonymous source to one of 56 deterministic 42-item form slots. Every slot still covers all seven families in each domain and preserves 2 easy / 3 medium / 2 hard.
4. **Anchor linking** — optional participants complete six unscored CIL anchor items after the unchanged 42 scored questions. One stable medium-difficulty anchor is reserved per domain and excluded from scored forms so the common-item link does not drift.
5. **Classical QA** — inspect p-values, item-rest correlations, distractors, skip/timeout rates, and timing anomalies.
6. **Reliability** — use `psych` for omega/alpha/split-half analyses by total score and domain.
7. **IRT** — use `mirt` for item difficulty/discrimination, multidimensional models, test information, and group comparisons. Missing-by-design data are expected; the common anchor block helps place forms on a shared scale.
8. **Fairness / DIF** — use `lordif` and/or multiple-group `mirt` to test whether age groups with comparable latent ability receive systematically different item difficulty.
9. **Construct validity** — use `lavaan` to compare six-domain, g-factor, and bifactor CFA structures and age-group measurement invariance.
10. **External linking** — link CIL sessions to scores/theta from a separately administered, properly licensed external measure using common-person IDs. Do not copy another test's norms or publish protected item content.
11. **Norming** — estimate age-band distributions, percentiles, standard errors, and confidence intervals. Only then may the product expose an IQ estimate.

## Matrix-sampled calibration forms

`matrix-form-core.js` defines the research-only 56-slot form cycle.

- Formal length stays exactly 42 scored questions.
- Every slot contains 6 domains × 7 task families.
- Every domain keeps 2 easy / 3 medium / 2 hard.
- Stable anchor IDs are excluded from every scored matrix form.
- Family/tier assignments are chosen deterministically to spread exposure across the active bank rather than relying only on random sampling.
- Within a family/tier cell, item selection rotates deterministically so repeated research participants distribute exposure across concrete surfaces.
- A pseudonymous `sourceKey` maps to a stable matrix slot through a versioned hash. The version, epoch, and slot are encoded in `formId`.

`calibration-matrix-form.js` activates this only when the user explicitly enters calibration research mode. Normal users continue to receive the standard randomized 42-item form.

`analysis/matrix_coverage.R` reports matrix-slot coverage, item exposure, and family/difficulty exposure from pooled exports. These coverage diagnostics do not modify scores and do not unlock IQ reporting.

## Internal anchor study

`anchor-core.js` deterministically selects a six-item anchor block from the final 2,058-item QB5 bank:

- one anchor per cognitive domain
- medium difficulty
- four valid answer options
- stable primary item ID per domain
- a stable item/content fingerprint on every anchor response
- fallback selection remains available only as a recovery/forensic mechanism

The six primary anchors are now reserved before the scored form is selected, leaving 2,052 active scored-form candidates and preventing the formal 42-item assessment from consuming an anchor ID.

`calibration-anchor-study.js` is opt-in. The formal assessment remains exactly 42 scored items; the six anchor items are presented afterwards and never modify CPI. Memory anchors retain one-shot exposure rules and timed anchors retain their deadline behavior. No correct-answer feedback is shown during the anchor block.

Anchor responses are appended to the same local calibration session using `formId = anchor:<anchor-version>`, so `mirt` and other missing-data psychometric workflows can recognize the common-item links.

## Tooling

- `psych`: reliability and factor diagnostics.
- `mirt`: 1PL/2PL/multidimensional IRT, test information, multiple-group models.
- `lordif`: ordinal/logistic DIF detection across age groups.
- `lavaan`: CFA and measurement invariance.
- `equateIRT`: optional linking/equating after common-person/common-item anchors exist.
- `ShinyItemAnalysis`: optional interactive inspection of exported data.
- `jMetrik`: optional GUI cross-check for CTT/IRT/DIF/linking.

These tools **flag evidence**. They do not directly rewrite questions or answer keys.

## Closed-loop item maintenance

Psychometric output feeds `item-review-policy.json` and `item-review-engine.js`. Each item receives one of:

- `KEEP`: no current evidence of a problem.
- `WATCH`: insufficient or borderline evidence; gather more data.
- `REVIEW`: evidence suggests difficulty/discrimination/timing/DIF/distractor issues.
- `REWRITE`: repeated evidence indicates the generator or wording should change.
- `RETIRE`: severe, replicated problems or unresolved fairness/validity issues.

Any rewrite must occur in the source generator or integrity layer, then pass the existing Oracle, uniqueness, option-quality, construct, Safari, timing, and production E2E gates. The analysis pipeline must never silently change an answer key.

## Data files

`schema.json` documents the pooled long-format response schema. The browser-facing study exporter includes:

- pseudonymous source key / session id
- whole-year age and age band
- item id / domain / family / semantic key / difficulty
- selected option index and correct option index
- binary correctness / skipped / timeout
- response seconds
- current bank, scoring, and form versions
- matrix form IDs when research matrix mode is active
- optional anchor form IDs and anchor metadata in the JSON study record

No automatic upload is enabled.

## External validation adapter

`external-validation-schema.json` and `analysis/external_linking.R` define a common-person adapter for separately administered validation measures. The repository stores only external score/theta metadata and permission references; it must not store protected item text or protected scoring keys.

ICAR is a useful research candidate, but its current distribution workflow requires registration and asks users not to publish its items or scoring key. Therefore Cognitive IQ Lab does **not** embed ICAR item content in the public repository. If approved ICAR access is obtained, administer it in a controlled research environment and import only the permitted score/theta result for common-person linking.

Commercial instruments (for example WAIS or proprietary Raven forms) must not be copied into the repository.

## Unlock criteria for IQ reporting

The exact study protocol still requires preregistration/research review, but product code should keep `iqEstimate = null` until all of the following are evidenced in versioned reports:

- sufficiently large independent sample across the supported 18–65 age range
- adequate matrix-slot and item exposure across calibration forms
- stable common-item/common-person linking through the anchor network
- acceptable total/domain reliability
- stable IRT parameters and useful information across the target ability range
- no unresolved material age DIF
- supported factor structure and age measurement invariance
- documented external/convergent validity or linking evidence
- age-norm tables with uncertainty estimates

Until then the public result remains CPI + `IQ estimate: not calibrated`.
