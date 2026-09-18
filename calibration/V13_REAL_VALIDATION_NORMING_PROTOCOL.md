# Calibration v13 — Real-Participant Validation & Representative Norming Protocol

Status: **prospective protocol only — no real-participant collection or analysis authorized**

Calibration v12 has confirmed the selected target-independent DIF method under synthetic
known-truth conditions. v13 moves to the next evidence layer: CIL-specific real-participant
psychometric validation and, only after a successful freeze, a separate representative norming
cohort.

This protocol does **not** authorize participant collection, participant-data access, backend
collection, external-instrument administration, norm estimation, norm publication, or IQ unlock.

## Authority

Basis:

- main: `f00849fc823676d4758332f9854c9e2f1b9a60bd`
- v12 confirmatory result: `confirmatory-pass`
- selected DIF method: `domain-loo-eap-fixed-theta`
- readiness policy: `CIL-PSYCH-2026.09.1`
- pooled-study policy: `CIL-POOL-2026.09.1`

Calibration v11 remains `failed-confirmatory`. v12 does not reinterpret it.

## Why two real-participant phases

### Phase A — real psychometric validation

Planning floor follows the existing calibration-candidate stage:

- >= 2,500 independent participants
- >= 250 per supported age band
- >= 48 Matrix slots
- >= 70% Anchor completion
- average formal-item exposure >= 40

Phase A may be used for reliability, domain 2PL IRT, real age-DIF, CFA/age-invariance screening,
external common-person linking, and human psychometric review.

**Phase A is not a formal norming cohort.**

If Phase A causes any item prompt, answer key, scoring rule, or measurement-model change, that
change must receive a new version. Data used to decide the change cannot silently become formal
product norms.

### Phase B — representative norming

Phase B may start only after the final bank, scoring logic, and measurement model are frozen.

It must use new independent participants whose `sourceKey` did not appear in Phase A.

Planning floor follows the existing norming-candidate stage:

- >= 5,000 independent participants
- >= 500 per supported age band
- all 56 Matrix slots
- >= 80% Anchor completion
- average formal-item exposure >= 80

These are collection/readiness floors, **not proof of representativeness**.

## Target population must be frozen first

Formal norms require a named population.

Before any real-participant collection is authorized, a pre-collection amendment must freeze:

- jurisdiction / population scope
- production language version
- sampling-frame reference
- population benchmark source and version
- benchmark dimensions
- weighting method

The current protocol deliberately leaves those fields unset. It is therefore impossible to
interpret a future convenience sample as a population norm merely because it reaches 5,000 people.

Cross-jurisdiction or cross-language pooling requires a new protocol version.

## Phase A screens

Existing readiness screens are retained as **screens, not validity proof**:

- all 6 domains must pass the reliability screen, omega total >= 0.70
- all 6 domains must be analyzable under domain 2PL IRT
- real age-DIF uses the v12-selected `domain-loo-eap-fixed-theta` method
- DIF settings remain Chisqr / alpha 0.01 / McFadden / reference delta-R2 0.02
- material-DIF screen <= 0.10
- final candidate requires zero unresolved material flags
- CFA screen: CFI >= 0.90 and RMSEA <= 0.08
- age invariance screen: absolute delta CFI <= 0.01

Real data have no known DIF truth, so v12 synthetic sensitivity is **not** reused as if it were
observable in Phase A.

## External validity / linking

Common-person linking remains required.

The existing policy floor is >= 100 linked participants for primary evidence. v13 sets a planning
target of 500 linked participants for more stable estimation and subgroup review; 500 is a planning
target, not a new automatic validity threshold.

Any external instrument must have documented permission. Protected item content and scoring keys
must not be stored in this repository. No external score is automatically converted to IQ.

## Representative sampling

Age-band minimums alone do not establish representativeness.

Before Phase B, the sampling plan must declare population benchmarks. Both unweighted and weighted
sample distributions must be reported, along with the weighting method and effective sample size.

Additional benchmark dimensions beyond age must be chosen and frozen before collection based on
the named target population and privacy/ethics review.

## Norm uncertainty

Phase B must report uncertainty rather than only point estimates.

The prospective default is a 2,000-replicate age-stratified bootstrap with 95% intervals for:

- age-band means
- age-band standard deviations
- p05
- p50
- p95
- any future score-conversion function

No automatic CI-width threshold is introduced here. Interpretation remains a human psychometric
review decision.

## Privacy and research governance

Current authority remains manual/offline export.

Before collection:

- explicit research consent is required
- ethics/IRB determination is required where applicable
- direct identifiers remain prohibited
- whole-year age is allowed; date of birth is not
- any additional demographic variables must be coarse, preregistered, justified, and consented
- a network/backend collection path requires its own privacy/security review and authorization

Raw participant data must not be committed to Git or uploaded as public workflow artifacts.

## IQ lock

Throughout v13 protocol preparation:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`
- automatic norm publication remains disabled

Passing every numeric screen would still not automatically unlock IQ. A separate human
psychometric review and explicit product-unlock decision are required after real validation,
representative norming, external validity/linking, and versioned uncertainty evidence are all
complete.

## Next boundary

The next scientific step is **not data collection**.

It is a pre-collection amendment that names the target population and freezes the sampling frame,
population benchmark source/version, demographic benchmark dimensions, and weighting plan.
