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
- targeted IRT and Age-DIF analysis only.

Example:

```bash
node scripts/run-monte-carlo-recovery.js \
  --replicates 5 \
  --participants 1200 \
  --seed-prefix cil-monte-carlo-v9 \
  --out calibration/output/monte-carlo-v9
```

The CI smoke run is intentionally smaller: two replicates × 900 synthetic participants. It checks that the full recovery path executes and produces finite diagnostics without making a post-hoc scientific PASS claim.

## Metrics

For regular non-defect items, v9 reports:

- correlation between known and estimated 2PL discrimination;
- correlation between known and estimated 2PL difficulty;
- discrimination RMSE;
- difficulty RMSE.

For injected controls, v9 reports:

- low-discrimination controls observed and estimated below an informational `|a| < .35` marker;
- negative-discrimination controls observed and estimated with negative slope;
- known Age-DIF controls observed and flagged;
- null-DIF items observed and falsely flagged;
- aggregate DIF sensitivity;
- aggregate DIF false-positive rate.

These are diagnostics. v9 deliberately does **not** define success thresholds after seeing the results. Any scientific thresholds intended to gate later work must be specified prospectively in a later versioned policy.

## Output isolation

Replicate-level synthetic response files and analysis outputs remain under the local/output or GitHub runner temporary directory.

The CI artifact contains only:

- `monte-carlo-recovery-summary.json`

The uploaded summary contains aggregate and replicate-level diagnostic counts/metrics only. It must not contain synthetic participant rows, `sourceKey`, `sessionId`, or any real participant data.

## Governance locks

Calibration v9 must preserve all of the following:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- no automatic participant upload
- no participant backend
- no automatic norm publication

A successful Monte Carlo recovery study demonstrates analysis-software behavior under known synthetic conditions. It is not reliability, validity, representativeness, external linking, norming, or IQ evidence for Cognitive IQ Lab.
