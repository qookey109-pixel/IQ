# Calibration v12 — Confirmatory Result

Status: **CONFIRMATORY PASS**

Authority and execution:

- execution commit: `9b12979a1083d008e4b3165d94de71b3ab37b80c`
- workflow run: `35343975015`
- aggregate artifact: `10546092439`
- selected method: `domain-loo-eap-fixed-theta`
- all 10 preregistered replicates completed successfully

## Frozen acceptance results

Clean panel false-positive rates:

- r01: `0.0238`
- r02: `0.0476`
- r03: `0.0000`
- r04: `0.0238`
- r05: `0.0238`

Worst clean-replicate FPR:

`0.0476 <= 0.10` — **PASS**

Implanted-DIF detection:

`26 / 30 = 0.8667 >= 0.70` — **PASS**

All 10 replicates completed — **PASS**

Therefore the preregistered v12 confirmatory verdict is:

**confirmatory-pass**

## Authority consumption

The one-time active execution authority has been consumed.

Its exact executed content is retained at:

`calibration/v12-confirmatory-execution-authority.executed.json`

The active runner path:

`calibration/v12-confirmatory-execution-authority.json`

is removed again, preventing the same authority from being reused.

## Historical boundary

Calibration v11 remains **failed-confirmatory** and is not reinterpreted.

The accidental legacy v12 run `35318989805` remains non-authoritative and was not used for inference.

## Governance

Still locked:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`
- automatic norm publication disabled

This pass validates the preregistered target-independent DIF matching method under synthetic
known-truth conditions only. It does not establish real-user fairness, population norms, or formal
IQ validity.
