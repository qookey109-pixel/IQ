# Calibration v11 DIF post-failure diagnostic evidence

Status: **post-failure diagnostic only**  
Confirmatory verdict: **failed-confirmatory (unchanged)**  
Frozen confirmatory head: `586f22d4b2ec405ae5ffd68def0f00f5b3423c73`  
Diagnostic evidence through: `14fd032ae604fb8e26ec01d851f625dd5db4305a`

## Scope and governance

This document records evidence collected **after** Calibration v11 failed its frozen confirmatory gate. It does not reinterpret, repair, rerun, or replace the confirmatory verdict.

The frozen v11 thresholds remain unchanged:

- reliability omega threshold: `.70`
- clean DIF maximum false-positive rate: `.10`
- replicates per condition: `3`
- participants per replicate: `1200`
- weak-control discrimination multiplier: `1.0`
- high-information-control discrimination multiplier: `2.0`

Product governance remains locked:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`

No post-failure diagnostic result is authority to change these values.

## Confirmatory failure being diagnosed

Calibration v11 successfully discriminated reliability:

- weak-control: reliability failed in 3/3 replicates as expected
- high-information-control: reliability passed in 3/3 replicates as expected

The overall confirmatory study nevertheless failed because high-information replicate 1 produced clean-panel age DIF false positives of:

- `5 / 42 = 0.119047619...`

This exceeded the frozen `.10` clean-DIF false-positive ceiling.

The synthetic clean panel contains no explicit age-DIF term for these items.

## Diagnostic evidence

### 1. Failure reproduced exactly

Post-failure Run #1 reproduced the high-information r01 result with the frozen seed and sample size:

- 42 clean-panel items
- 5 final `lordif` flags
- FPR `5/42`
- 1200 participants

### 2. The final flags are not only tiny chi-square effects

Direct inspection of `lordif::fit$stats` showed the five final flagged items had McFadden pseudo-R2 values approximately:

- `.0513`
- `.0734`
- `.0602`
- `.0459`
- `.0925`

Therefore the final confirmatory failure cannot be dismissed as chi-square significance with negligible effect size.

### 3. Known true theta removes material clean-panel DIF

Using generator-known domain theta as the DIF matching variable:

- estimated-response theta path: 5 material final signals
- known true-theta path: **0 material signals**

This supports an estimated-theta conditioning artifact rather than true age DIF in the synthetic generator.

### 4. Conditioning-layer isolation

The post-failure conditioning audit produced:

| Matching / stage | Statistical flags | Material McFadden R2 flags |
| --- | ---: | ---: |
| true theta | 3/42 | **0/42** |
| pipeline EAP | 5/42 | **2/42** |
| lordif initial theta | 5/42 | **2/42** |
| lordif sparse theta | 5/42 | **5/42** |
| lordif final | 5/42 | **5/42** |

The evidence therefore supports this sequence:

`true theta: 0 material DIF -> estimated EAP: 2 material DIF -> lordif purification: 5 material DIF`

Purification did not create the five statistical signals from nothing. It amplified three already-statistical, initially sub-material signals across the material-effect threshold.

### 5. Initial material items

The two items already material before purification were:

- `SYN-01-13` — verbal-comprehension
  - high-information effective discrimination approximately `a=2.98`
  - difficulty `b=+1.0`
  - initial McFadden R2 approximately `.0255`
- `SYN-05-14` — processing-speed
  - high-information effective discrimination approximately `a=2.80`
  - difficulty `b=+1.5`
  - initial McFadden R2 approximately `.0725`

The pattern is more consistent with a **difficult + steep item / short-scale conditioning** problem than with difficulty alone.

### 6. Leave-one-item-out matching

To test item-in-matching contamination, the target item was excluded when estimating its matching theta.

For `SYN-01-13`:

- full 7-item EAP: McFadden R2 `.0255`
- leave-one-out 6-item EAP: McFadden R2 `.0191`
- material-effect classification falls below the `.02` reference level
- a chi-square flag remains

For `SYN-05-14`:

- full 7-item EAP: McFadden R2 `.0725`
- leave-one-out 6-item EAP: McFadden R2 `.0231`
- the chi-square flag disappears

This shows that including the target item in a short matching scale is an important contributor to the initial false DIF signal.

### 7. Residual verbal signal is consistent with short-scale theta noise

For `SYN-01-13`:

- known true theta: no statistical DIF; McFadden R2 approximately `.0124`
- full EAP: statistical DIF; McFadden R2 approximately `.0255`
- leave-one-out EAP: residual uniform-group chi-square signal; McFadden R2 approximately `.0191`

The leave-one-out verbal theta has lower recovery against true theta than the full EAP, consistent with the cost of estimating ability from only six remaining items.

Its standardized age-band mean bias versus true theta was approximately:

| Age band | LOO-minus-true theta mean bias |
| --- | ---: |
| 18-24 | +0.0436 SD |
| 25-34 | +0.0143 SD |
| 35-44 | -0.0376 SD |
| 45-54 | -0.0252 SD |
| 55-65 | +0.0154 SD |

These shifts are small, but they are systematic enough to support a residual short-scale matching-error explanation for the remaining uniform chi-square signal.

## Current root-cause assessment

The converging post-failure evidence supports the following mechanism:

1. a seven-item domain scale provides an imperfect response-estimated theta;
2. including the target item in that theta creates item-in-matching contamination;
3. steep / difficult items are especially sensitive to the local conditioning error;
4. leave-one-item-out matching materially reduces the initial false DIF;
5. with only six remaining items, residual theta-estimation noise can still leave a small group-location signal;
6. `lordif` purification then amplifies several boundary signals from sub-material to material effects.

This is evidence for a **short-scale estimated-theta conditioning artifact with self-inclusion and purification amplification**. It is not evidence that the clean synthetic generator contains real age DIF.

## Separate production defect

A separate implementation defect was identified in `calibration/analysis/age_dif.R`:

- production `difDeltaR2` extraction does not read the McFadden values from the correct `lordif` location;
- the relevant values are in `fit$stats`;
- current production output can therefore leave `difDeltaR2` unavailable.

This defect **did not cause the v11 confirmatory failure**, because the frozen v11 clean-DIF gate counted `difFlag` directly.

Any repair to `difDeltaR2` must be handled as a separate controlled production change and must not modify the frozen v11 verdict, thresholds, or governance locks.

## Evidence runs

Key diagnostic workflow runs:

- Run #1: `35239085751` — exact r01 reproduction
- Run #2: `35243696184` — effect-size diagnostic
- Run #3: `35244268673` — true-theta conditioning audit
- Run #4: `35244848841` — conditioning-layer isolation
- Run #5: `35296459327` — purification age-band shift
- Run #6: `35296964831` — leave-one-item-out matching
- Run #7: `35298565213` — target matching-source comparison
- Run #8: `35298785709` — leave-one-out age-band theta bias

All of these are post-failure diagnostics. None changes the confirmatory authority.
