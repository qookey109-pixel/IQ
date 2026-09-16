# Calibration v10 — Full-Pipeline Recovery Results

Status date: 2026-09-16

Calibration v10 is a synthetic known-truth **software / method-validation** stage. It extends v9 from targeted IRT + Age-DIF recovery to the integrated psychometric pipeline. It is not evidence that the live product is reliable, representative, externally valid, normed, or an IQ scale.

## Evidence authority

Development/smoke evidence:

- branch: `feature/calibration-v10-full-pipeline-recovery`
- head: `8ca2adfa9d38d7ed7d6af0bdd83b0a0dd55ed9ca`
- workflow run: `35054182587`
- configuration: 900 synthetic participants, seed `cil-v10-ci`
- artifact: `calibration-v10-full-pipeline-recovery-summary`
- artifact ID: `10430091558`
- deterministic replay: PASS
- aggregate-only privacy gate: PASS

Pre-specified multi-seed stability evidence:

- study head: `c7c59363a99a75f94ff3225082264231fa5cc8ea`
- workflow run: `35054640366`
- job: `bounded-full-stability`
- configuration: 5 deterministic replicates × 1,200 synthetic participants
- seed prefix: `cil-v10-full-stability`
- development seed excluded: yes
- artifact: `calibration-v10-full-pipeline-stability-summary`
- artifact ID: `10430770715`
- workflow result: PASS
- aggregate-only privacy gate: PASS

The full-study configuration and seed prefix were committed before those five seeds were executed. The synthetic generator truth was not changed after the development result, and no post-hoc scientific success threshold was introduced.

## Structural result

All five new replicates completed the integrated pipeline and all structural checks passed:

- six-domain reliability output present;
- IRT / Age-DIF path completed;
- CFA / age-invariance diagnostics finite;
- provisional general-theta output recovered for the full synthetic cohort;
- five research age-band tables produced;
- all synthetic participants linked to the synthetic external criterion;
- research standard-score generation remained disabled;
- aggregate-only artifact privacy passed.

`complete-diagnostic` means the software path produced structurally usable diagnostics. It does **not** mean the observed psychometric values meet a real-product validation standard.

## Reliability — persistent limitation

The development run showed alpha/omega around 0.60–0.62. The five independent stability seeds confirmed that this was not a one-seed fluctuation.

| Domain | Mean omega total | Min | Max |
| --- | ---: | ---: | ---: |
| verbal-comprehension | 0.6190 | 0.5927 | 0.6363 |
| fluid-reasoning | 0.5816 | 0.5586 | 0.6050 |
| visual-spatial | 0.6006 | 0.5807 | 0.6185 |
| working-memory | 0.6051 | 0.5869 | 0.6284 |
| processing-speed | 0.5682 | 0.5507 | 0.5860 |
| quantitative-reasoning | 0.6152 | 0.5944 | 0.6366 |

All six synthetic-domain omega values remain below the existing pooled-data readiness screen of `minimumOmegaTotal = 0.70`.

This does **not** prove that the live question bank has low reliability. The v10 panel contains only seven synthetic items per domain and is a deliberately bounded software-validation design. It does show that this particular synthetic design cannot be used as positive evidence that the `.70` reliability screen is recoverable or satisfied. The limitation must stay visible rather than being corrected by changing synthetic truth after inspection.

Processing-speed is the weakest reliability domain in this design; fluid-reasoning is next weakest.

## CFA / age invariance path

Across the five new seeds:

- configural CFI mean: **0.9941**; range **0.9828–1.0000**
- configural RMSEA mean: **0.0168**; range **0–0.0466**
- metric-vs-configural ΔCFI mean: **+0.0020**; range **0–+0.0052**
- scalar-vs-metric ΔCFI mean: **+0.0004**; range **0–+0.0014**

The integrated CFA/invariance software path is stable under the clean synthetic design. Because the synthetic design intentionally does not create age-group factor non-invariance, these values validate expected software behavior only; they are not evidence of invariance in real participants.

## Provisional general-theta recovery

Correlation between standardized estimated provisional general theta and known synthetic `g`:

- mean: **0.8728**
- min: **0.8600**
- max: **0.8797**

Standardized RMSE versus known synthetic `g`:

- mean: **0.5040**
- min: **0.4902**
- max: **0.5288**

The recovery is stable across the five independent seeds. The existing `general_theta.R` output remains a research-only mean of standardized fitted domain EAP values, not a validated latent `g` or IQ score.

## Research norming path

Age-band mean recovery RMSE, comparing standardized estimated theta band means with standardized known synthetic-`g` band means:

- mean: **0.0177**
- min: **0.0114**
- max: **0.0245**

All five age bands were produced in every replicate. This validates table generation and aggregate band-mean recovery in the synthetic design only. It does not address representative sampling, sampling weights, population coverage, uncertainty estimation, or real norms.

Research standard-score generation remained disabled throughout.

## Synthetic external-linking path

The synthetic external criterion was generated prospectively with CPI slope `0.60`, age slope `0.05`, and Gaussian noise SD `4`.

Across five new seeds:

- Pearson correlation mean: **0.9247**; range **0.9225–0.9267**
- CPI slope bias mean: **-0.0017**; range **-0.0144 to +0.0072**
- age slope bias mean: **-0.00144**; range **-0.0122 to +0.0070**

The linking code recovers the deliberately generated relationship closely. Because the criterion itself is synthetic and partly generated from CPI, this is a regression/linking software-recovery test, not external or convergent validity evidence for the product.

## Clean-panel Age-DIF false positives

v10 injects no Age-DIF into the clean 42-item panel. Therefore every flag is a synthetic false positive.

Across five seeds:

- mean false-positive rate: **3.81%**
- minimum: **2.38%** (`1 / 42`)
- maximum: **7.14%** (`3 / 42`)

This is a useful stability diagnostic for the no-DIF condition. v9 remains the complementary evidence for sensitivity to deliberately implanted DIF.

## Scientific interpretation

Calibration v10 supports the following limited conclusions:

1. the integrated reliability → IRT/DIF → CFA/invariance → general-theta → research-norming → external-linking pipeline executes reproducibly on bounded clean synthetic data;
2. CFA/invariance, general-theta recovery, aggregate age-band recovery, synthetic linking, and clean-panel DIF behavior are stable across the five pre-specified independent seeds;
3. the seven-item-per-domain synthetic panel has consistently weak internal-consistency reliability, with omega total roughly `0.55–0.64` across domains/seeds;
4. that reliability weakness is a limitation of the current v10 synthetic design/evidence package and must not be hidden or reclassified after inspection;
5. no v10 result establishes real-user reliability, construct validity, external validity, representative norms, or IQ calibration.

A future confirmatory stage can prospectively define acceptance thresholds and use independent data/seeds, but it must not retroactively turn these exploratory/stability observations into a pass rule.

## Governance

All locks remain closed:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- `containsRealParticipants = false`
- `syntheticOnly = true`
- automatic participant upload = false
- automatic norm publication = false

## Disposition

Calibration v10 is **complete as a synthetic full-pipeline diagnostic/stability package**, with the reliability limitation explicitly unresolved for product validation purposes.

Before merge, the branch still requires cross-stage regression, branch/main diff review, governance-lock review, and final PR-triggered CI. A v10 merge must not be interpreted as an IQ/norm unlock.
