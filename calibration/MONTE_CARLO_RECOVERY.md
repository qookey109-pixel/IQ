# Calibration v9 — Monte Carlo Recovery Validation

Calibration v9 tests whether the existing psychometric analysis code can recover known properties from synthetic data before any formal participant study is used to support product claims.

It is a **method-validation layer only**. Synthetic recovery results cannot become product norms, cannot convert CPI to IQ, and cannot unlock an IQ estimate.

## Why this stage exists

The offline validation lab already generates deterministic synthetic item responses with known item parameters and deliberately injected controls:

- one low-discrimination control per domain;
- one age-DIF control per domain;
- one negative-discrimination control per domain;
- known positive-discrimination / known-difficulty regular items.

Earlier synthetic matrix sampling deliberately spreads exposure across a larger bank. That design is useful for coverage testing, but its sparse missing-by-design pattern is not appropriate for a direct DIF-recovery benchmark because the current `age_dif.R` screen conservatively requires at least 50% observed responses for an item.

Therefore v9 adds a **synthetic-only recovery panel**:

- 42 total items;
- 6 domains × 7 items;
- the same 42 recovery-panel items are administered to every synthetic participant;
- the first three items in each domain are the existing low-discrimination, age-DIF, and negative-discrimination controls;
- this panel is activated only by `--panel recovery`;
- the existing default synthetic `matrix` mode is unchanged.

The recovery panel is not a production assessment form and is never shown to real participants.

## Recovery runner

`node scripts/run-monte-carlo-recovery.js`

Default research configuration:

- 5 deterministic replicates;
- 1,200 synthetic participants per replicate;
- independent seed suffix per replicate;
- deterministic R estimator seed derived from each replicate seed;
- targeted IRT and Age-DIF analysis only.

Example:

```bash
node scripts/run-monte-carlo-recovery.js \
  --replicates 5 \
  --participants 1200 \
  --seed-prefix cil-monte-carlo-v9 \
  --out calibration/output/monte-carlo-v9
```

The ordinary CI smoke run remains intentionally smaller: two replicates × 900 synthetic participants. It checks that the full recovery path executes and produces finite diagnostics without making a post-hoc scientific PASS claim.

## Bounded full study

Calibration v9.3 pre-specifies one bounded full diagnostic study before its results are inspected:

- 5 replicates;
- 1,200 synthetic participants per replicate;
- seed prefix `cil-mc-v9-full`;
- the same fixed 42-item recovery panel;
- the same synthetic truth, including `ageDif = 0.70` for the implanted DIF control;
- the same `lordif` criterion (`Chisqr`) and `alpha = 0.01`;
- no post-hoc change to effect size, alpha, truth parameters, or scoring gates based on the earlier 2 × 900 smoke results.

The GitHub workflow runs this heavier study only on a push whose commit message contains `[v9-full]`. This keeps routine branch CI bounded while preserving a versioned, reproducible full-study trigger.

The full study is still diagnostic. It does not introduce empirical success thresholds and cannot unlock product scoring or formal norming.

### Deterministic analysis seed

The synthetic response generator is deterministic from the replicate seed. v9.2+ also derives a positive R integer seed from that same replicate seed and passes it to both `irt_mirt.R` and `age_dif.R` through `CIL_ANALYSIS_SEED`. Both R scripts call `set.seed()` when the variable is present.

This is a reproducibility control, not a scientific threshold. Re-running the same replicate seed should not materially change the estimator simply because the R process started with a different RNG state. Separate GitHub runners may still differ at floating-point machine precision because of underlying numerical libraries; counts, flags, and scientific interpretation must remain stable.

### DIF-compatible control separation

The full 42-item recovery panel remains the IRT input so the low- and negative-discrimination controls can be evaluated directly.

`lordif` requires positive item slopes in its IRT probability path. Therefore the Age-DIF leg receives a synthetic-only temporary derivative of the same response data that excludes only the 6 low-discrimination controls and 6 negative-discrimination controls. It retains all 6 implanted age-DIF controls plus 24 regular items, for 5 DIF-compatible items per domain.

This separation does not rewrite item truth, reverse-score negative controls, weaken a gate, or change the production/default question sampler. The temporary participant-level DIF input remains inside the local/GitHub runner temporary directory and is never uploaded.

## Metrics

For regular non-defect items, v9 reports both overall and per-domain recovery diagnostics:

- correlation between known and estimated 2PL discrimination;
- correlation between known and estimated 2PL difficulty;
- discrimination RMSE;
- difficulty RMSE;
- discrimination bias (`estimated a - known a`);
- difficulty bias (`estimated b - known b`).

The aggregate report also summarizes the across-replicate range of each metric for every domain so seed/domain instability is visible instead of being hidden by one overall value.

For injected discrimination controls, v9 reports overall counts plus aggregate domain-level diagnostics:

- low-discrimination controls observed and estimated below an informational `|a| < .35` marker;
- the estimated `a` range for each domain's low-discrimination control across replicates;
- negative-discrimination controls observed and estimated with negative slope;
- the estimated `a` range for each domain's negative-discrimination control across replicates.

For Age-DIF recovery, v9 reports both overall and per-domain diagnostics:

- known Age-DIF controls observed and flagged;
- null-DIF items observed and falsely flagged;
- DIF sensitivity;
- DIF false-positive rate;
- per-domain counts showing where implanted controls were detected or missed and where null items were falsely flagged.

These are diagnostics. v9 deliberately does **not** define success thresholds after seeing the results. Any scientific thresholds intended to gate later work must be specified prospectively in a later versioned policy.

## Structural completeness gate

`complete-diagnostic` only means the bounded recovery workflow produced structurally usable diagnostics. It requires finite overall and per-domain correlation/RMSE/bias values for all six fixed domains, observed low/negative discrimination controls in every domain, non-empty matched IRT output, and non-empty Age-DIF output containing the implanted control in every domain for every replicate.

It does **not** mean the values are scientifically acceptable. Scientific review must still inspect effect sizes, bias, domain stability, control recovery, DIF sensitivity, false-positive rate, and repeated-run reproducibility.

## Output isolation

Replicate-level synthetic response files and analysis outputs remain under the local/output or GitHub runner temporary directory.

The CI artifacts contain only aggregate-safe JSON summaries. They must not contain synthetic participant rows, `sourceKey`, `sessionId`, or any real participant data.

## Governance locks

Calibration v9 must preserve all of the following:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- no automatic participant upload
- no participant backend
- no automatic norm publication

A successful Monte Carlo recovery study demonstrates analysis-software behavior under known synthetic conditions. It is not reliability, validity, representativeness, external linking, norming, or IQ evidence for Cognitive IQ Lab.
