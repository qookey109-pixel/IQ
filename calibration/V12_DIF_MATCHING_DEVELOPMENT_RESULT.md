# Calibration v12 — DIF Matching Development Result

Status: **development method selected; confirmatory remains locked**

Authority:

- execution commit: `6b90d4855eac8ed37ff14f435470a4615184cae0`
- workflow run: `35320435949`
- aggregate artifact: `10538417515`
- protocol: `CIL-V12-DIF-MATCHING-2026.09.2`
- all 10 preregistered development shards: **SUCCESS**

## Development result

Both selectable candidates passed the frozen gates.

| Method | Worst clean-replicate FPR | Aggregate implanted-DIF sensitivity | Gate |
| --- | ---: | ---: | --- |
| `domain-loo-eap-fixed-theta` | 0.0714 | 23/30 = 0.7667 | PASS |
| `crossfit-six-factor-map-fixed-theta` | 0.0714 | 23/30 = 0.7667 | PASS |
| current iterative `lordif` reference | 0.1667 | 1/30 = 0.0333 | non-selectable reference |

Frozen gates were:

- every clean replicate FPR `<= 0.10`
- aggregate implanted-DIF sensitivity `>= 0.70`
- all development replicates complete

## Selected method

**`domain-loo-eap-fixed-theta`**

The selection is mechanical under the preregistered tie-break:

1. both candidates had the same worst clean-replicate FPR: `0.0714`;
2. both candidates had the same implanted-DIF sensitivity: `0.7667`;
3. the preregistered final tie-break prefers `domain-loo-eap-fixed-theta` as the lower-complexity method.

No threshold or method rule was changed after observing the results.

## Historical boundary

Calibration v11 remains **failed-confirmatory**.

Legacy workflow run `35318989805` is non-authoritative because an older escaped GitHub `if:` expression unintentionally started a legacy full-development job. Its output is not used for method selection.

## Governance

Still locked:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- confirmatory seeds used = **false**
- confirmatory execution authorized = **false**

This development result does not establish real-user fairness, population norms, or IQ validity.

## Next boundary

The selected implementation is frozen by exact Git blob/content pins in
`calibration/v12-dif-matching-method-freeze.json`.

The next research stage is **confirmatory preparation/review only**. Actual confirmatory execution
requires separate authorization and must use the already-reserved independent confirmatory seed families.
