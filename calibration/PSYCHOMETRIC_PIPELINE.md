# Calibration v5 — Pooled Psychometric Pipeline

This layer turns the manually pooled, consented calibration cohort into reproducible psychometric research outputs. It does not upload participant data, mutate the live question bank, publish norms, or unlock IQ reporting.

## Input

Default input:

`calibration/output/pooled-study/pooled-independent-responses.csv`

The input should come from `scripts/pool-calibration-exports.js` so consent, privacy, 42-item completeness, source-key independence, Matrix slot bounds, age-band consistency, and Anchor integrity have already been checked.

## Run

Install R dependencies once:

```bash
Rscript calibration/analysis/install-packages.R
```

Then run:

```bash
node scripts/run-psychometric-pipeline.js \
  --input calibration/output/pooled-study/pooled-independent-responses.csv \
  --out calibration/output/psychometric-v5
```

Optional controlled external linking data can be supplied with:

```bash
--external calibration/data/external-validation.csv
```

Use `--dry-run` to inspect the exact execution plan without reading participant data or running R.

## Analysis order

1. `reliability.R` — domain alpha / omega screening.
2. `irt_mirt.R` — domain 2PL calibration, item parameters, participant domain theta.
3. `age_dif.R` — age-group DIF review signals.
4. `cfa_invariance.R` — provisional score-level general-factor and age-invariance screen.
5. `general_theta.R` — research-only composite of standardized fitted domain EAP theta values. This is explicitly **not** a validated g factor.
6. `norming.R` — research age-band distribution table. Standard-score output remains disabled unless `ALLOW_RESEARCH_STANDARD_SCORE=1`, and even then it is research-only.
7. `external_linking.R` — optional common-person external validity/linking analysis without storing protected item content or scoring keys.
8. `build-psychometric-readiness-report.js` — combines the outputs into item-health, review-queue, readiness and blocker reports.

## Outputs

The v5 output directory contains, when sufficient data are available:

- `reliability.json`
- `irt-domain-summary.csv`
- `item-parameters.csv`
- `participant-domain-theta.csv`
- `age-dif.csv`
- `cfa-invariance.json`
- `participant-general-theta.csv`
- `general-theta-manifest.json`
- `age-norm-table-research.csv`
- `norming-manifest.json`
- optional `external-linking.json`
- `item-health.csv`
- `item-review-queue.json`
- `psychometric-readiness.json`
- `psychometric-report.md`
- `pipeline-manifest.json`

## Item-bank feedback loop

`item-health.csv` merges observed difficulty, exposure, skips/timeouts, distractor usage, IRT discrimination and age-DIF signals. The existing review engine classifies items as:

`KEEP → WATCH → REVIEW → REWRITE → RETIRE`

These labels are review priorities only. They never change a prompt, answer key or live-bank status automatically. A real question change must still occur at the generator/source level and pass the existing Oracle, unique-answer, construct, timing, Safari and final-production regression gates.

## Readiness screens

`calibration/psychometric-readiness-policy.json` contains versioned engineering screens for reliability, IRT coverage, DIF, CFA/invariance, norming and external linking.

They are **screening rules, not proof of validity**. A screen passing does not establish clinical validity, population representativeness, or an IQ scale.

## IQ lock

Calibration v5 always keeps:

- `productIqUnlocked = false`
- `populationNormed = false`
- automatic CPI→IQ conversion disabled
- automatic publication of research norms disabled

Public IQ reporting requires separate, versioned evidence for reliability, item calibration and information, fairness/DIF, construct validity and age invariance, external/convergent validity or linking, representative age norms, and uncertainty / standard errors. Human psychometric review is required before any future unlock decision.
