# Calibration v12 — Development Execution Authority

Status date: 2026-09-18

This document records execution authority for the **development-only** Calibration v12 DIF matching comparison.

## Authority boundary

Protocol version:

- `CIL-V12-DIF-MATCHING-2026.09.2`

Development branch:

- `research/calibration-v12-dif-matching-development-20260918`

Validated implementation head before the full-development trigger:

- `2dbeb7f1bf41b5addc081e128224d36b6edb1f64`

Bounded integration smoke:

- workflow run: `35320067201`
- result: **SUCCESS**
- selection eligible: **false**
- confirmatory seeds used: **false**
- product IQ/norm governance locks: closed

The smoke established only that the development harness, R analysis, six-factor MAP scoring,
fixed-theta DIF path, aggregate-only output guard, and governance assertions execute successfully.

## Non-authoritative accidental run

Workflow run `35318989805` started a legacy single-job `full-development` path because an older
workflow revision contained an escaped GitHub `if:` expression.

That run is **not development-selection authority** and its output must not be used to select,
freeze, promote, or reject a v12 matching method.

The execution bug was corrected before the authoritative full-development trigger. The current
workflow uses a parsed GitHub expression and a 10-shard layout.

## Authoritative full-development study

The next push whose commit message contains `[v12-dev-full]` is the authorized v12
development-selection execution.

Frozen design:

- 2 panels: clean + implanted-DIF
- 5 deterministic development replicates per panel
- 1,200 synthetic participants per replicate
- 7 target items per domain / 42 target items per replicate
- 10 independent workflow shards
- one aggregate-only final summary
- clean FPR ceiling: `0.10`
- aggregate implanted-DIF sensitivity floor: `0.70`

Candidate methods:

- `domain-loo-eap-fixed-theta`
- `crossfit-six-factor-map-fixed-theta`

The current iterative `lordif` path remains a non-selectable reference baseline.

## Governance

The full-development study may choose a development candidate according to the preregistered
selection rule. It may **not**:

- run confirmatory seed families;
- reinterpret Calibration v11;
- change thresholds after observing results;
- publish norms;
- unlock IQ;
- enable CPI-to-IQ conversion.

Required locks remain:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`

Confirmatory execution remains separately locked even if a development candidate is selected.
