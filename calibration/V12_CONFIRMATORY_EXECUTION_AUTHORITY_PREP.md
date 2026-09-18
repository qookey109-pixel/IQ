# Calibration v12 — Confirmatory Execution Authority Preparation

Status: **prepared, not authorized, not executable**

This stage records the exact execution contract that would be required for a future formal
Calibration v12 confirmatory run. It intentionally does **not** create the active authority file
that the runner accepts.

## Exact pins

The prepared proposal is bound to:

- basis main: `d3fe8b3b3019ae8aae5baace5da17059235c0033`
- preregistration blob: `edb01e1790bee7cb05f72578d9c501aa4e848ea2`
- runner blob: `4e15ca5b94c3138239ae297d9450b1ed15e9f5ea`
- selected-method analysis blob: `7782586b3a5bc31a94e2204759c45702813ce545`
- selected method: `domain-loo-eap-fixed-theta`

## Frozen execution scope

A future authority may cover only the complete preregistered study:

- 5 clean replicates
- 5 implanted-DIF replicates
- 1,200 synthetic participants per replicate
- 42 target items per replicate
- every clean replicate FPR <= 0.10
- aggregate implanted-DIF sensitivity >= 0.70

The following remain forbidden:

- partial execution
- seed overrides
- method overrides
- threshold overrides
- runner-up fallback
- partial-run inference

## Why this proposal is non-executable

The repository contains:

`calibration/v12-confirmatory-execution-authority.proposed.json`

The runner requires instead:

`calibration/v12-confirmatory-execution-authority.json`

The required active file remains absent. The proposal also keeps:

- `executionAuthorized=false`
- `userAuthorizationRecorded=false`
- `confirmatorySeedsConsumed=false`

CI verifies both the exact blob pins and the absence of the active file.

## Next authority boundary

A separate explicit authorization is required before creating the active authority file. At that
future point, activation must preserve the exact method, hashes, scope, thresholds, and governance
locks recorded here.

Even a future synthetic confirmatory PASS would not, by itself, establish population norms,
real-user fairness, or formal IQ validity.
