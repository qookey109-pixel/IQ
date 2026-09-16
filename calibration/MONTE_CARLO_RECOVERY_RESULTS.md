# Calibration v9 — Monte Carlo Recovery Results

Status date: 2026-09-16

Calibration v9 is a synthetic known-truth **method-validation** study. These results describe recovery behavior of the analysis pipeline only. They are not reliability, external validity, population norming, CPI→IQ linking, or product-IQ evidence.

## Evidence authority

Bounded full-study workflow:

- branch: `feature/calibration-v9-monte-carlo-recovery`
- study head: `cd66adcb915b40908ec9b72a7906444b7ff811bd`
- workflow run: `35052009808`
- job: `bounded-full-recovery`
- configuration: 5 deterministic replicates × 1,200 synthetic participants
- seed prefix: `cil-mc-v9-full`
- design: fixed 42-item synthetic recovery panel
- artifact: `calibration-v9-monte-carlo-full-summary`
- artifact ID: `10428873089`
- workflow result: PASS
- aggregate-only privacy gate: PASS

The study configuration was committed before this full study was observed. It retained the existing synthetic truth (`ageDif = 0.70` for each implanted Age-DIF control), `lordif` criterion `Chisqr`, and `alpha = 0.01`. No scientific success threshold was invented after observing the result.

## Structural and governance result

The full study produced `status = complete-diagnostic`. All five replicates produced finite overall and six-domain recovery diagnostics, all six domains exposed their low-/negative-discrimination controls and implanted Age-DIF control, and the aggregate-only artifact passed the privacy guard.

Governance remained locked throughout:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- `containsRealParticipants = false`
- `syntheticOnly = true`

## Overall IRT recovery

| Metric | Mean | Min | Max |
| --- | ---: | ---: | ---: |
| discrimination correlation (`a`) | 0.8270 | 0.7955 | 0.8883 |
| difficulty correlation (`b`) | 0.9839 | 0.9770 | 0.9875 |
| discrimination RMSE | 0.1650 | 0.1279 | 0.2317 |
| difficulty RMSE | 0.1196 | 0.0992 | 0.1422 |
| discrimination bias | -0.0030 | -0.0280 | 0.0443 |
| difficulty bias | 0.0520 | 0.0004 | 0.0823 |

Interpretation: difficulty recovery is consistently strong across the five seeds. Discrimination recovery is materially positive and much more stable at the 24-regular-item aggregate level than the earlier two-seed smoke snapshot, but it remains less precise than difficulty recovery.

## Per-replicate overview

| Replicate | `a` corr | `b` corr | `a` RMSE | `b` RMSE | Known DIF detected | Null DIF flagged |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| r01 | 0.8267 | 0.9875 | 0.1346 | 0.1239 | 4 / 6 | 1 / 24 |
| r02 | 0.7978 | 0.9770 | 0.2317 | 0.1422 | 5 / 6 | 2 / 24 |
| r03 | 0.8883 | 0.9850 | 0.1279 | 0.1017 | 5 / 6 | 0 / 24 |
| r04 | 0.7955 | 0.9855 | 0.1433 | 0.1310 | 2 / 6 | 0 / 24 |
| r05 | 0.8266 | 0.9843 | 0.1875 | 0.0992 | 5 / 6 | 3 / 24 |

## Domain IRT recovery

Each domain-level correlation is based on only four regular non-defect items. These correlations are therefore useful diagnostics but are intrinsically high-variance and must not be interpreted like a correlation estimated from a large item set.

| Domain | mean `a` corr | min–max `a` corr | mean `b` corr | mean `a` RMSE | mean `b` RMSE |
| --- | ---: | ---: | ---: | ---: | ---: |
| verbal-comprehension | 0.9314 | 0.8959–0.9621 | 0.9949 | 0.1008 | 0.0858 |
| fluid-reasoning | 0.9493 | 0.8987–0.9922 | 0.9949 | 0.1297 | 0.0841 |
| visual-spatial | 0.7949 | 0.4223–0.9565 | 0.9769 | 0.2322 | 0.1392 |
| working-memory | 0.8549 | 0.5585–0.9908 | 0.9930 | 0.1423 | 0.0979 |
| processing-speed | 0.8033 | 0.3934–0.9545 | 0.9902 | 0.1733 | 0.1588 |
| quantitative-reasoning | 0.9331 | 0.8374–0.9609 | 0.9941 | 0.1185 | 0.0839 |

The lower single-seed `a` correlations in visual-spatial and processing-speed remain visible and are not hidden or post-hoc corrected. Given four regular items per domain, v9 treats them as a design-limited diagnostic rather than evidence for domain-specific product calibration.

## Deliberate discrimination controls

Across 5 replicates × 6 domains:

- low-discrimination controls observed: 30 / 30
- low-discrimination controls estimated at `|a| < .35`: 30 / 30
- negative-discrimination controls observed: 30 / 30
- negative-discrimination controls estimated with negative slope: 30 / 30

All six domains recovered both control directions in all five full-study seeds. The low-discrimination controls were not deleted or reverse-scored; negative controls remained in the IRT recovery path and were excluded only from the `lordif` Age-DIF path because `lordif` requires positive item slopes.

## Age-DIF recovery

Aggregate result:

- implanted Age-DIF controls observed: 30
- implanted controls detected: 21
- sensitivity: **70%**
- null-DIF items observed: 120
- null items flagged: 6
- false-positive rate: **5%**

Per-domain result:

| Domain | Known DIF detected | Sensitivity | Null flagged | FPR |
| --- | ---: | ---: | ---: | ---: |
| verbal-comprehension | 5 / 5 | 100% | 0 / 20 | 0% |
| fluid-reasoning | 4 / 5 | 80% | 1 / 20 | 5% |
| visual-spatial | 4 / 5 | 80% | 3 / 20 | 15% |
| working-memory | 2 / 5 | 40% | 0 / 20 | 0% |
| processing-speed | 2 / 5 | 40% | 0 / 20 | 0% |
| quantitative-reasoning | 4 / 5 | 80% | 2 / 20 | 10% |

Interpretation: the pipeline detects a substantial majority of the implanted DIF signals while keeping the aggregate null false-positive rate low, but sensitivity is not uniform across domains. Working-memory and processing-speed are the weakest DIF-recovery domains in this fixed design; visual-spatial has the highest observed domain FPR. v9 records these limitations rather than changing the implanted effect or alpha after seeing the data.

## Reproducibility

The v9.2/v9.3 runner derives a deterministic R estimator seed from each synthetic replicate seed and sends it to both IRT and DIF analyses.

Evidence:

- same-job deterministic replay at head `bc6b98bad360be316dc230de099d675483885349`: PASS
- separate GitHub Actions rerun on the same head: PASS
- counts, booleans, flags and statuses matched across the two independent runner attempts
- floating-point fields differed only at machine precision; maximum absolute difference observed was approximately `2.95e-11`

This resolves the earlier material same-seed estimator drift without pretending that independent numerical-library executions must be bit-identical.

## Scientific interpretation and limitations

Calibration v9 demonstrates that the implemented synthetic pipeline can recover known 2PL difficulty strongly, recover discrimination direction/ordering meaningfully at the aggregate level, identify deliberately weak and negative discrimination controls, and detect implanted Age-DIF with non-zero and majority sensitivity while maintaining a low aggregate false-positive rate.

Important limitations remain:

1. only four regular items per domain contribute to each domain-level `a`/`b` correlation, so domain correlations are noisy by construction;
2. Age-DIF sensitivity is heterogeneous, especially for working-memory and processing-speed;
3. this is synthetic known-truth evidence, not evidence that the live item bank is valid, invariant, representative, or normed in a real population;
4. no empirical v9 pass/fail threshold was pre-registered, so these observed values must not be converted into a post-hoc product-unlock rule.

Accordingly, v9 can support review of the **analysis method and its documented limitations**. It cannot support formal IQ claims, product norms, automatic item retirement, or CPI→IQ conversion.

## Disposition

The bounded synthetic study is complete as a diagnostic evidence package. Before any merge, the branch must still pass the relevant calibration regression suite, branch/main diff review, governance-lock review, and final pull-request CI.
