# Calibration v6 — Offline Validation Lab

Calibration v6 intentionally does **not** add a participant-data backend. The production website stays local-first: calibration records remain in the browser unless a person explicitly downloads them.

The lab exists to keep improving and testing the psychometric engineering stack without silently collecting real participant data.

## Allowed sources

1. **Synthetic calibration data** — deterministic simulated response data used to test the software and analysis pipeline.
2. **Manual local exports** — files that a user has explicitly exported from their own browser and then deliberately supplied for offline analysis.
3. **Public external datasets** — already-scored response datasets used for method validation or external/convergent research. These remain isolated from Cognitive IQ Lab product norms.

## Explicitly not included

- No Supabase project.
- No Render/Postgres participant database.
- No automatic upload.
- No background telemetry collection.
- No `fetch`, XHR, beacon, or hidden form submission path for research records.
- No automatic CPI-to-IQ conversion.
- No automatic product norm publishing.

## Synthetic mode

Generate a deterministic synthetic calibration set:

```bash
node scripts/run-offline-validation-lab.js \
  --mode synthetic \
  --participants 600 \
  --seed cil-offline-v1 \
  --out calibration/output/offline-validation-v6
```

This produces a 42-response session for each synthetic participant across six synthetic cognitive domains. The generator includes a small number of deliberately weak/DIF-like control items so downstream QA can be tested.

Synthetic data are **method-validation data only**. They are not reliability, validity, fairness, representative norming, or IQ evidence.

To run the v5 psychometric pipeline on the generated synthetic file after R and its packages are available:

```bash
node scripts/run-offline-validation-lab.js \
  --mode synthetic \
  --participants 600 \
  --seed cil-offline-v1 \
  --out calibration/output/offline-validation-v6 \
  --run-psychometrics
```

Use `--install-packages` only when you explicitly want the R package installer to run.

## Manual local-export mode

A deliberately exported local CIL pooled response CSV can be analyzed without any server:

```bash
node scripts/run-offline-validation-lab.js \
  --mode local \
  --input /path/to/pooled-independent-responses.csv \
  --out calibration/output/offline-validation-v6 \
  --run-psychometrics
```

The act of supplying the file is manual. v6 does not discover or upload browser records by itself.

## Public external dataset mode

The public adapter accepts **already-scored binary response columns**. It does not store item text or scoring keys.

1. Copy `calibration/public-dataset-mapping.example.json`.
2. Set a dataset ID, participant-ID column, age column, scored item columns, license reference and source citation.
3. Run:

```bash
node scripts/run-offline-validation-lab.js \
  --mode public \
  --input /path/to/public-responses.csv \
  --mapping /path/to/mapping.json \
  --out calibration/output/offline-validation-v6
```

The adapter:

- rejects direct-identifier-like columns such as name, email, phone, address, location, IP, account ID and date of birth;
- hashes the source participant identifier into a dataset-scoped pseudonym;
- retains only whole-year age, age band, external item ID and scored 0/1 response;
- marks every row `productNormEligible=false` and `cilItem=false`;
- refuses to accept stored protected item content or scoring keys.

Public external responses are intentionally **not** sent into the CIL product-norm pipeline. They can support method testing or separately designed external validity work, but they cannot become Cognitive IQ Lab norms merely because they are large.

## Dry-run

Inspect the execution plan without reading participant data or running R:

```bash
node scripts/run-offline-validation-lab.js --mode synthetic --dry-run
```

## Relationship to Calibration v5

Calibration v5 remains the psychometric analysis engine:

`reliability → 2PL IRT → age DIF → CFA/invariance → provisional research theta → research norming → item-health/readiness`

v6 changes the **source and execution environment**, not the validity standard. In particular:

- synthetic outputs cannot unlock product norms;
- public external outputs cannot be mixed into CIL product norms;
- provisional theta is not IQ;
- `productIqUnlocked` remains `false`;
- item review still requires generator-level fixes and the existing regression gates.

## Output isolation

All v6 outputs belong under `calibration/output/`, which is ignored by Git. Participant-derived or externally derived datasets must not be committed to the repository.

## Future work without a backend

The project can continue improving through:

- stronger synthetic recovery tests for known item parameters;
- Monte Carlo checks of IRT/DIF detection behavior;
- adapters for additional legally usable public scored-response datasets;
- offline test/retest analysis from manually supplied exports;
- generator-level remediation of items flagged by the v5 item-health queue;
- versioned offline research reports.

None of those require live participant-data collection.
