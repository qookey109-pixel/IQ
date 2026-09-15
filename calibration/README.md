# Cognitive IQ Lab — Calibration v1

This directory defines the research pipeline required before Cognitive IQ Lab may report an IQ estimate.

## Core rule

CPI is the current product score. It must not be relabeled or algebraically converted into IQ. An IQ estimate is only unlocked after pooled, consented data support age-normed calibration, reliability, validity, fairness, and score-linking evidence.

## Pipeline

1. **Collect** — export pseudonymous item-level response data from the browser. Whole-year age only; no birthday, name, account, IP, or location.
2. **Pool** — combine voluntary exports while deduplicating the same browser/source key. Repeated sessions are not treated as independent people.
3. **Classical QA** — inspect p-values, item-rest correlations, distractors, skip/timeout rates, and timing anomalies.
4. **Reliability** — use `psych` for omega/alpha/split-half analyses by total score and domain.
5. **IRT** — use `mirt` for item difficulty/discrimination, multidimensional models, test information, and group comparisons.
6. **Fairness / DIF** — use `lordif` and/or multiple-group `mirt` to test whether age groups with comparable latent ability receive systematically different item difficulty.
7. **Construct validity** — use `lavaan` to compare six-domain, g-factor, and bifactor CFA structures and age-group measurement invariance.
8. **External linking** — when an approved public-domain anchor set is administered to the same participants, estimate linking/equating rather than copying another test's norms.
9. **Norming** — estimate age-band distributions, percentiles, standard errors, and confidence intervals. Only then may the product expose an IQ estimate.

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

`schema.json` documents the pooled long-format response schema. The browser-facing study exporter is designed to include:

- pseudonymous source key / session id
- whole-year age and age band
- item id / domain / family / semantic key / difficulty
- selected option index and correct option index
- binary correctness / skipped / timeout
- response seconds
- current bank, scoring, and form versions

No automatic upload is enabled.

## External anchors

Only items with compatible licensing may be added as research anchors. Public-domain/open research instruments such as ICAR are candidates, but every imported item must have its license/source recorded. Commercial instruments (for example WAIS or proprietary Raven forms) must not be copied into the repository.

## Unlock criteria for IQ reporting

The exact study protocol still requires preregistration/research review, but product code should keep `iqEstimate = null` until all of the following are evidenced in versioned reports:

- sufficiently large independent sample across the supported 18–65 age range
- adequate item exposure across calibration forms
- acceptable total/domain reliability
- stable IRT parameters and useful information across the target ability range
- no unresolved material age DIF
- supported factor structure and age measurement invariance
- documented external/convergent validity or linking evidence
- age-norm tables with uncertainty estimates

Until then the public result remains CPI + `IQ estimate: not calibrated`.
