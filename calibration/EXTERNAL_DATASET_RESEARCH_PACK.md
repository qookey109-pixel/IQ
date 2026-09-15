# Calibration v7 — External Dataset Research Pack

This layer validates Cognitive IQ Lab's psychometric **methods**, not its product norms.

## Primary dataset: ICAR / SAPA

The first enabled external dataset is **Selected ICAR Data from the SAPA-Project**:

- Dataset DOI: https://doi.org/10.7910/DVN/AD9RVY
- Data paper: https://doi.org/10.5334/jopd.25
- Reported sample: 96,958 participants
- Reported age range: 14–90
- CIL research filter: 18–65
- 60 already-scored binary cognitive items
  - 9 Letter/Number Series (`LN`)
  - 11 Matrix Reasoning (`MR`)
  - 16 Verbal Reasoning (`VR`)
  - 24 3-D Rotation (`R3D`)
- License: CC0 Public Domain Dedication
- Administration: sparse SAPA / missing-by-design; participants answered random subsets

The raw third-party dataset is **not committed to this repository**. Download it from the cited repository, then process it locally.

## Local workflow

1. Obtain the scored ICAR/SAPA CSV from the cited Dataverse record.
2. Keep the raw file outside git (recommended path: `calibration/input/external/icar-sapa.csv`).
3. Normalize only the scored responses:

```bash
node scripts/normalize-icar-sapa.js calibration/input/external/icar-sapa.csv
```

4. Inspect the plan without running analysis:

```bash
node scripts/run-external-dataset-research-pack.js --dry-run
```

5. After R and the required packages are installed, run the external analysis:

```bash
node scripts/run-external-dataset-research-pack.js \
  --input calibration/input/external/icar-sapa.csv \
  --run-r
```

Outputs remain under `calibration/output/`, which is gitignored.

## What the ICAR adapter does

`scripts/normalize-icar-sapa.js`:

- requires exactly 60 scored columns matching `LN*`, `MR*`, `VR*`, or `R3D*`;
- verifies the expected 9/11/16/24 domain counts;
- keeps only ages 18–65 for comparability with the current CIL adult pilot scope;
- accepts only binary `0/1` scored values and preserves missing-by-design responses as missing;
- creates dataset-local pseudonymous participant keys from row position;
- stores no item text and no scoring key;
- marks every row `productNormEligible=false`, `cilItem=false`, and `productIqUnlocked=false`.

## Analysis outputs

`calibration/analysis/external_icar_validation.R` is source-isolated from the CIL norming pipeline and produces research diagnostics such as:

- domain reliability (alpha / omega where estimable),
- domain 2PL IRT item parameters,
- age-band score summaries,
- logistic-regression age-DIF screening that controls for within-domain rest score,
- exploratory four-factor IRT fit diagnostics.

The age-DIF output is deliberately labelled a **screen**. It is useful for validating the fairness-analysis workflow on a large external dataset, but it is not evidence that a Cognitive IQ Lab item has or does not have DIF.

These results are useful for validating software behavior, model assumptions, missing-data handling, and age-group analysis design. They do **not** create a CIL IQ scale.

## Other catalogued datasets

### OECD PIAAC

PIAAC is highly relevant to adult cognitive/skills research, but its Public Use Files are terms-bound. The catalog therefore marks it `manual-access-candidate`:

- no automated bypass of the OECD access flow;
- no redistribution of terms-bound microdata;
- no direct CIL norming from PIAAC.

### OECD PISA

PISA provides large cognitive item-response datasets, but its target population is school-age students. It is therefore only a method stress-test candidate and cannot support the current CIL adult 18–65 norm.

## Hard safety boundaries

External research data may validate analysis methods or provide convergent/structural evidence. They must never automatically:

- become Cognitive IQ Lab product norms;
- unlock IQ reporting;
- convert CPI to IQ;
- mutate prompts or answer keys;
- retire items;
- be uploaded to a participant backend.

`productIqUnlocked` remains `false` until CIL-specific population evidence exists.
