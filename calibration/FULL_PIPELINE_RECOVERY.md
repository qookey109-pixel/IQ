# Calibration v10 — Full-Pipeline Synthetic Recovery

Calibration v10 extends the synthetic method-validation surface beyond the IRT + Age-DIF focus of v9.

It validates whether the **existing full psychometric pipeline** can execute coherently on clean synthetic known-truth data and expose aggregate diagnostics for:

- reliability;
- IRT and Age-DIF as part of the integrated pipeline;
- score-level CFA / age invariance;
- provisional general-theta construction;
- research-only age norm tables;
- common-person external linking;
- psychometric readiness reporting.

This stage remains synthetic-only. It is not population evidence and cannot unlock IQ reporting.

## Why v10 uses a clean panel

Calibration v9 deliberately includes low-discrimination, negative-discrimination, and implanted Age-DIF controls. Those controls are useful for targeted recovery testing, but they are intentionally pathological inputs for a full reliability / CFA / norming diagnostic.

v10 therefore adds a separate `pipeline` panel to `generate-synthetic-calibration.js`:

- 42 common items;
- 6 domains × 7 items;
- one complete difficulty ladder per domain (`b = -1.5 ... +1.5`);
- positive discrimination;
- no implanted Age-DIF;
- no low-discrimination control;
- no negative-discrimination control.

The existing default `matrix` panel and v9 `recovery` panel are unchanged.

## Known-truth signals

The synthetic generator retains participant-level truth only inside the private runner directory:

- latent general factor `syntheticG`;
- six synthetic domain theta values;
- age / age band;
- CPI generated from the same synthetic responses.

v10 also creates a synthetic common-person external criterion with predeclared generation parameters:

- intercept = `20`;
- CPI slope = `0.60`;
- age slope = `0.05`;
- Gaussian noise SD = `4`.

The external file contains no item content and no scoring key.

Participant-level synthetic truth and external rows are never uploaded as CI artifacts.

## Deterministic full-pipeline analysis

`run-psychometric-pipeline.js` accepts:

```bash
--analysis-seed <positive integer>
```

When present, the runner exports `CIL_ANALYSIS_SEED` to the analysis subprocesses. This preserves the existing CLI defaults while allowing synthetic validation to reproduce the estimator RNG used by IRT / DIF code.

v10 derives that integer deterministically from the study seed.

## Bounded CI study

The branch workflow runs:

```bash
node scripts/run-full-pipeline-recovery.js \
  --participants 900 \
  --seed cil-v10-ci
```

It then repeats the exact same study inside the same job and requires the aggregate summary (excluding `generatedAt`) to match exactly.

This is a reproducibility check, not a scientific success threshold.

## Aggregate diagnostics

The public aggregate summary contains:

### Reliability

For all six domains:

- status;
- participant count;
- item count;
- raw alpha;
- omega total;
- omega hierarchical when available.

### CFA / invariance

- configural CFI / RMSEA / SRMR;
- metric CFI / RMSEA / SRMR;
- scalar CFI / RMSEA / SRMR;
- CFI and RMSEA deltas.

### General-theta recovery

The provisional estimated composite is matched to the private synthetic truth by pseudonymous source key inside the runner, then only aggregate results are retained:

- matched participant count;
- correlation between standardized estimated theta and standardized true `g`;
- standardized RMSE.

### Norming-path recovery

For each of the five age bands:

- aggregate n;
- estimated theta mean / SD;
- standardized estimated band mean;
- standardized true-`g` band mean.

The summary also reports age-band mean recovery RMSE.

The research standard-score output remains disabled (`ALLOW_RESEARCH_STANDARD_SCORE=0`).

### External-linking recovery

For the synthetic criterion:

- linked participant count;
- Pearson / Spearman association;
- adjusted R²;
- fitted CPI slope;
- known CPI slope and slope bias;
- fitted age slope;
- known age slope and slope bias.

### Clean-panel Age-DIF

Because v10 intentionally injects no DIF, any `lordif` flag is a synthetic false positive. The aggregate summary reports analyzed rows, flags, and false-positive rate.

## Structural completeness

`complete-diagnostic` means only that all pipeline stages produced finite, structurally usable outputs:

- six reliability domains are present;
- CFA / invariance produces finite fit diagnostics;
- provisional general theta is available for at least 90% of the synthetic cohort;
- all five age bands reach the research norm table;
- all synthetic participants link to the external criterion;
- the pipeline manifest reports success;
- research standard scores remain disabled;
- product IQ / norm publication locks remain false.

Calibration v10 deliberately does **not** define scientific pass thresholds after seeing v9. A later confirmatory study may preregister thresholds and independent holdout seeds before execution.

## Governance locks

v10 must preserve:

- `containsRealParticipants = false`
- `syntheticOnly = true`
- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- no participant backend
- no automatic upload
- no automatic norm publication

A successful v10 diagnostic validates analysis-software behavior only. It does not establish reliability, construct validity, external validity, representativeness, age norms, or IQ calibration for real users.
