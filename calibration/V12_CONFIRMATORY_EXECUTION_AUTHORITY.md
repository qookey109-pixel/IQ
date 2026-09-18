# Calibration v12 — Confirmatory Execution Authority

Status: **formally authorized for one complete preregistered execution**

User authorization was explicitly provided on 2026-09-18.

This execution authority is restricted to the already-preregistered v12 confirmatory design.

## Exact frozen pins

- basis main: `513a08d7f54d22506b2d43865607814614a88664`
- preregistration blob: `edb01e1790bee7cb05f72578d9c501aa4e848ea2`
- runner blob: `4e15ca5b94c3138239ae297d9450b1ed15e9f5ea`
- selected-method analysis blob: `7782586b3a5bc31a94e2204759c45702813ce545`
- selected method: `domain-loo-eap-fixed-theta`

## Authorized execution

Exactly one complete study:

- 5 clean replicates
- 5 implanted-DIF replicates
- 1,200 synthetic participants per replicate
- 42 target items per replicate
- reserved confirmatory seeds only
- no partial execution
- no seed override
- no method override
- no threshold override
- no runner-up fallback
- no partial-run inference

Acceptance remains:

- every clean replicate DIF false-positive rate <= 0.10
- aggregate implanted-DIF sensitivity >= 0.70
- all 10 replicates complete

## Result handling

The workflow does not expose replicate-level participant/session data. Private synthetic working
files are deleted by the runner after each replicate. Only the aggregate 10-replicate summary is
uploaded after the full study completes.

No partial result is used to alter the study while execution is underway.

## Governance

This authority does not change:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`

A synthetic confirmatory pass would validate this preregistered DIF method under known-truth
simulation only. It would not establish population norms, real-user fairness, or formal IQ validity.
