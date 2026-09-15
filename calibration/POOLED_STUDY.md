# Cognitive IQ Lab — Pooled Study v1

Pooled Study v1 is the offline cohort-building layer between browser-local calibration exports and the existing `psych` / `mirt` / `lordif` / `lavaan` analysis pipeline.

It does **not** collect data automatically, does **not** create a server or database, and does **not** unlock an IQ estimate.

## Data flow

1. A participant completes the normal 42 scored questions.
2. Calibration research participation must be explicitly opted in.
3. Research mode may use one of the 56 deterministic matrix forms.
4. The participant may complete the six unscored common Anchor items.
5. The browser exports the calibration JSON manually to the participant/researcher.
6. Multiple exported JSON files are pooled offline with `scripts/pool-calibration-exports.js`.
7. The pooled long-format CSV can then feed reliability, IRT, DIF/fairness, construct-validity, linking, and norming analyses.

There is no network upload call in the pooling tool.

## Run

```bash
node scripts/pool-calibration-exports.js \
  --out calibration/output/pooled-study \
  participant-001.json participant-002.json participant-003.json
```

The output directory contains:

- `pooled-independent-responses.csv` — one selected independent session per pseudonymous `sourceKey`, in long format.
- `pooled-consented-sessions.json` — all valid consented sessions, including repeats, for retest/reliability work.
- `pooled-study-summary.json` — age, Anchor, Matrix and item-exposure readiness diagnostics.
- `pooled-age-band-counts.csv` — independent participant count by supported age band.
- `pooled-item-exposure.csv` — formal item exposure counts for the selected independent cohort.

`calibration/output/` is a local analysis output path and should not be committed.

## Eligibility and privacy gates

An export is rejected before pooling when it contains identifying-key fields such as name, email, account ID, IP address, location/address, birthday/date of birth, or phone number.

The export must explicitly declare:

- `automaticUpload = false`
- no name/account/birthday/IP/location data
- `iqEstimateAvailable = false`
- `populationNormed = false`

A session is structurally valid only when it has:

- a pseudonymous source key that matches its export
- whole-year age 18–65 and the matching age band
- exactly 42 scored formal rows
- 42 unique formal item IDs
- one consistent formal `formId`
- valid option/correctness/timing fields
- no non-null IQ estimate
- a Matrix slot in `00..55` when the form claims Matrix mode
- exactly six unique-domain Anchor rows when `anchorStudy.completed = true`

Only sessions with `anchorStudy.optIn = true` enter the pooled cohort.

## Independence rule

`sourceKey` is the independence unit. Repeated sessions from the same browser/source key are retained for longitudinal/retest analysis but do not count as multiple independent people.

For the independent cohort, the selector prefers:

1. a structurally valid session with a completed six-domain Anchor block
2. otherwise a valid Matrix-form session
3. otherwise the earliest valid consented session

This protects readiness counts from repeated testing inflating the sample size.

## Readiness stages

`pooled-study-policy.json` defines three **engineering planning gates**:

| Stage | Independent participants | Minimum per age band | Matrix slots | Anchor completion | Avg. formal item exposure |
|---|---:|---:|---:|---:|---:|
| Pilot | 250 | 30 | 14 | 50% | 4 |
| Calibration candidate | 2,500 | 250 | 48 | 70% | 40 |
| Norming candidate | 5,000 | 500 | 56 | 80% | 80 |

These are operational collection targets, **not evidence that a test is valid or normed**. Passing them must never by itself expose an IQ score.

IQ remains locked until versioned evidence independently supports reliability, IRT fit/information, DIF/fairness, construct validity and age invariance, external/convergent validity or linking, representative age norms, and norm uncertainty / standard errors.

## Backend status

Pooled Study v1 intentionally stops before server-side collection. A future backend may use Supabase, Render Postgres, or another reviewed research store, but that is a separate privacy/security decision. Until such a design is explicitly approved, the authority is manual local export + offline pooling only.
