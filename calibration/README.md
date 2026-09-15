# Cognitive IQ Lab — Calibration Pipeline

This directory defines the research pipeline required before Cognitive IQ Lab may report an IQ estimate.

## Core rule

CPI is the current product score. It must not be relabeled or algebraically converted into IQ. An IQ estimate is only unlocked after pooled, consented data support age-normed calibration, reliability, validity, fairness, and score-linking evidence.

## Pipeline

1. **Collect** — export pseudonymous item-level response data from the browser. Whole-year age only; no birthday, name, account, IP, or location.
2. **Pool** — combine voluntary exports while deduplicating the same browser/source key. Repeated sessions are not treated as independent people.
3. **Anchor linking** — optional participants complete six unscored CIL anchor items after the unchanged 42 scored questions. One medium-difficulty anchor is selected per domain, avoiding an item already used in the same formal form. Stable anchor fingerprints detect content drift.
4. **Classical QA** — inspect p-values, item-rest correlations, distractors, skip/timeout rates, and timing anomalies.
5. **Reliability** — use `psych` for omega/alpha/split-half analyses by total score and domain.
6. **IRT** — use `mirt` for item difficulty/discrimination, multidimensional models, test information, and group comparisons. Missing-by-design data are expected; the common anchor block helps place forms on a shared scale.
7. **Fairness / DIF** — use `lordif` and/or multiple-group `mirt` to test whether age groups with comparable latent ability receive systematically different item difficulty.
8. **Construct validity** — use `lavaan` to compare six-domain, g-factor, and bifactor CFA structures and age-group measurement invariance.
9. **External linking** — link CIL sessions to scores/theta from a separately administered, properly licensed external measure using common-person IDs. Do not copy another test's norms or publish protected item content.
10. **Norming** — estimate age-band distributions, percentiles, standard errors, and confidence intervals. Only then may the product expose an IQ estimate.

## Internal anchor study

`anchor-core.js` deterministically selects a six-item anchor block from the final 2,058-item QB5 bank:

- one anchor per cognitive domain
- medium difficulty
- four valid answer options
- no duplication with the participant's 42-item formal form
- a stable item/content fingerprint on every anchor response
- fallback bridge items when a primary anchor happened to appear in the formal form

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
- optional anchor form IDs and anchor metadata in the JSON study record

No automatic upload is enabled.

## External validation adapter

`external-validation-schema.json` and `analysis/external_linking.R` define a common-person adapter for separately administered validation measures. The repository stores only external score/theta metadata and permission references; it must not store protected item text or protected scoring keys.

ICAR is a useful research candidate, but its current distribution workflow requires registration and asks users not to publish its items or scoring key. Therefore Cognitive IQ Lab does **not** embed ICAR item content in the public repository. If approved ICAR access is obtained, administer it in a controlled research environment and import only the permitted score/theta result for common-person linking.

Commercial instruments (for example WAIS or proprietary Raven forms) must not be copied into the repository.

## Unlock criteria for IQ reporting

The exact study protocol still requires preregistration/research review, but product code should keep `iqEstimate = null` until all of the following are evidenced in versioned reports:

- sufficiently large independent sample across the supported 18–65 age range
- adequate item exposure across calibration forms
- stable common-item/common-person linking through the anchor network
- acceptable total/domain reliability
- stable IRT parameters and useful information across the target ability range
- no unresolved material age DIF
- supported factor structure and age measurement invariance
- documented external/convergent validity or linking evidence
- age-norm tables with uncertainty estimates

Until then the public result remains CPI + `IQ estimate: not calibrated`.
