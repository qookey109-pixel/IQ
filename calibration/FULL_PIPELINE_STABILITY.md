# Calibration v10 — Multi-Seed Full-Pipeline Stability Study

Status: pre-specified before the full-study seeds are executed.

The first v10 development/smoke run used seed `cil-v10-ci` with 900 synthetic participants. It established that the full pipeline can execute end to end and revealed one important development observation: six-domain alpha/omega values were around 0.60–0.62 in that clean 7-item-per-domain design. That observation is retained as a limitation; the generator truth is not altered to make reliability look stronger.

## Independent stability configuration

The heavier stability study is fixed as:

- 5 deterministic replicates;
- 1,200 synthetic participants per replicate;
- seed prefix `cil-v10-full-stability`;
- replicate seeds `cil-v10-full-stability-r01` through `r05`;
- clean 42-item pipeline panel;
- same generator truth as the development run;
- same full psychometric analysis path;
- deterministic per-replicate analysis seed;
- research standard-score generation disabled;
- aggregate-only public artifact.

The development seed `cil-v10-ci` is excluded from the five-study summary.

## What is evaluated

The aggregate stability summary reports mean/min/max across the five new seeds for:

- alpha / omega by domain;
- CFA configural CFI / RMSEA and invariance CFI deltas;
- general-theta correlation with known synthetic `g` and standardized RMSE;
- age-band mean recovery RMSE;
- synthetic external-linking Pearson association;
- CPI slope bias relative to known slope `0.60`;
- age slope bias relative to known slope `0.05`;
- clean-panel Age-DIF false-positive rate.

## Interpretation rule

No scientific success threshold is introduced in this v10 full study after observing the development seed. The five-seed run is a **stability characterization**: it shows whether the same strengths and weaknesses persist across independent deterministic seeds.

In particular, the study must not reinterpret omega values below the existing pooled-data readiness screen (`minimumOmegaTotal = 0.70`) as acceptable merely because the synthetic pipeline is structurally complete.

A later confirmatory stage may define prospective acceptance thresholds using independent seeds/data, but those thresholds must be versioned before those confirmatory results are observed.

## Governance

Throughout the study:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- no real participant data are read or uploaded
- no participant-level synthetic rows are published
- no automatic norm publication occurs

This study validates software stability only. It does not establish real-user reliability, validity, representativeness, age norms, or IQ calibration.
