# IQ Project Maintenance Audit — 2026-09-18

Status: maintenance checkpoint  
Authority baseline: `main@ecfe4568cd3a2f455b186d11bf7297189899e83a`  
Working branch: `maintenance/project-audit-cleanup-20260918`

## Objective

Perform a repository-wide maintenance pass covering:

- project structure
- website runtime
- active CI/test authority
- calibration/research reproducibility
- legacy assets
- generated outputs
- repository hygiene
- low-risk size reduction

This maintenance pass must not change psychometric governance, scoring policy, DIF thresholds, Calibration v11's confirmatory verdict, or product IQ/norming locks.

## Baseline

Before maintenance:

- 169 tracked files
- 1,147,877 tracked bytes
- main CI: green
- GitHub Pages: green

After the first safe cleanup pass:

- 153 tracked files
- approximately 1,064,709 tracked bytes
- reduction: approximately 83 KB / 7.2%
- root-level JS/CSS orphan count: 0

## Removed retired legacy chain

The following files were removed because they belonged to retired QB4 / legacy rendering paths, were not loaded by the current website, and were not part of the current main Question Bank Validation execution chain:

### Retired runtime / UI layers

- `clarity-v2.js`
- `clarity-v3.js`
- `clarity-theme.css`
- `matrix-cluster-items.js`
- `matrix-cluster-renderer-v2.js`
- `memory-answer-quality.js`
- `option-quality-v3.js`
- `spatial-task-diagrams.js`

### Retired exporter

- `scripts/export-qb4.js`

### Retired validation tests

- `tests/clarity-v2-validation.js`
- `tests/clarity-v3-validation.js`
- `tests/matrix-cluster-items-validation.js`
- `tests/matrix-cluster-renderer-validation.js`
- `tests/memory-answer-quality-validation.js`
- `tests/spatial-task-diagrams-validation.js`

## Removed obsolete website preload

`questions.js` was an older static sample question set and still contained historical timing values.

The current QB5 production chain creates `window.IQ_QUESTIONS` from the controlled question bank and is independently validated without `questions.js`.

Actions:

- removed `questions.js`
- removed its script tag from `index.html`
- reduced the website by one request
- removed stale static question/timing data from the repository

## Repository hygiene

Updated `.gitignore` to ignore:

- `calibration/output/`
- `dist/`
- `.visual-review.html`
- `.DS_Store`

This prevents generated exports, calibration outputs, visual-review fixtures, and macOS metadata from entering source control.

## Documentation organization

Moved root-level research notes into:

- `docs/research/QUESTION_BANK_RESEARCH.md`
- `docs/research/OPTION_QUALITY_RESEARCH.md`

The root is now focused more clearly on the production web runtime.

## Website runtime status

After cleanup, `index.html` loads:

- 7 CSS files
- 43 JavaScript files

All remaining root-level JS/CSS files are referenced by the production page. No additional root-level runtime file is currently safe to delete solely as an orphan.

The relatively large runtime request count is a valid future optimization target, but consolidation/bundling is intentionally **not** mixed into this deletion pass because it would alter the deployment architecture and require dedicated browser/runtime verification.

Recommended future website optimization node:

1. build a deterministic production bundle while preserving source modules for tests;
2. compare content/timing digest before and after bundling;
3. validate Safari/mobile behavior and Pages deployment;
4. only then reduce runtime request count.

## Calibration / research preservation

The following were deliberately retained even when historical:

- Calibration v8 / v9 / v10 workflows
- recovery and stability reports/specifications
- ICAR/SAPA adapters and validation scripts
- psychometric analysis scripts
- matrix sampling and pooled-study policies
- governance locks and readiness policy
- post-v10 research infrastructure

Reason: these files preserve reproducibility, auditability, and scientific lineage. They are not website runtime bloat.

## Development utilities retained

`scripts/build-visual-review.js` is retained because it is a deliberate development-only visual QA fixture and writes to the gitignored `.visual-review.html`.

Other current calibration, export, and QA tools remain because they are referenced by active CI, current research workflows, or reproducibility procedures.

## Governance invariants

This maintenance node does not change:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`
- Calibration v11 `failed-confirmatory`
- DIF thresholds
- scoring behavior
- answer keys
- production bank semantics
- timing policy

## Exit criteria for this node

Before merge:

- final diff reviewed
- no deleted file referenced by current production runtime
- Question Bank Validation passes
- Psychometric Pipeline Validation passes
- Calibration Cross-Stage Regression passes when triggered
- Pooled / Offline / External validation passes
- Pages build succeeds
