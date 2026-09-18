# Calibration v13 — Taiwan Schema / Privacy Amendment

Status: **schema/privacy defined — collection still locked**

The Taiwan target-population freeze requires three coarse research fields before representative
weighting can be performed. This amendment defines those fields and their privacy semantics, but it
does **not** activate collection.

The production exporter and pooled-study runtime remain on schema v1.

## Minimum session-level research metadata

Only three new fields are proposed:

### `householdRegistrationEligibility`

Boolean.

Used only to determine whether a participant belongs to the frozen Taiwan household-registered
target population.

Primary target-population / norming eligibility requires `true`.

### `sexForWeighting`

Allowed values:

- `male`
- `female`
- `not-stated`

The official benchmark exposes male/female margins. `not-stated` is intentionally supported so a
participant is not forced to disclose this field.

The value must never be inferred from name, account information, browsing behavior, or other
signals.

### `macroRegion`

Allowed values:

- `north`
- `central`
- `south`
- `east`
- `offshore`
- `not-stated`

Only the five-region category is retained. Raw county/city, address, GPS, IP-derived location, and
precise location are not required or authorized.

The value must never be inferred from IP address.

## Refusal and weighting

A participant who chooses `not-stated` may remain usable for preregistered psychometric validation
where appropriate.

However, the primary raked norming cohort requires benchmarkable values for both
`sexForWeighting` and `macroRegion`, plus
`householdRegistrationEligibility=true`.

Missing/refused values must not be imputed from other personal signals.

## Consent

Before any future collection, the research disclosure must explicitly explain:

- that the fields are collected for fairness / representative-weighting analysis;
- that `not-stated` is available for sex and macro region;
- that participation does not unlock an IQ score;
- that no automatic upload occurs under the currently authorized architecture.

The consent text/version itself must be frozen before collection.

## Data minimization

Still prohibited:

- name
- email
- account ID
- phone
- birthday / date of birth
- IP address
- precise location
- street address
- raw county/city storage

Whole-year age remains allowed.

The three proposed fields live once at session level. They are not duplicated into all 42 item rows.

## Retention

The future retention duration and deletion procedure are intentionally **not** invented here.

They must be frozen before collection begins.

Participant-level raw data may not be committed to Git or uploaded as public workflow artifacts.
Public reporting remains aggregate-only.

## Proposed schema only

A new file is added:

`calibration/pooled-study-schema-v2-tw.proposed.json`

It is deliberately **not** connected to the production exporter or
`scripts/pool-calibration-exports.js`.

Current runtime authority therefore remains schema v1.

Activating v2 requires a separate explicit activation step after the recruitment/consent design is
also reviewed.

## Locks

Still false:

- real-participant collection authorization
- participant-data access authorization
- external-instrument administration
- Phase A analysis authorization
- Phase B collection authorization
- Phase B norm estimation authorization
- backend collection authorization
- production exporter modification authorization
- `productNormEligible`
- `productIqUnlocked`
- `autoCpiToIq`

## Next gate

After this amendment is merged, the next low-risk step is to define the Taiwan recruitment and
consent execution plan. That plan must specify recruitment channels, anti-duplication controls,
consent wording/version, retention/deletion policy, and the exact point at which the proposed
schema could be activated.

It still must not collect real participant data without a separate collection authorization.
