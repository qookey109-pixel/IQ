# Calibration v12 — Confirmatory Preregistration

Status: **design preregistered; execution locked**

This document freezes the confirmatory design after the v12 development stage selected
`domain-loo-eap-fixed-theta`.

## Authority

- basis main: `4f15e7ad4b294e34c0d4c5156ba2ddc9918e9371`
- development authority run: `35320435949`
- development selected-method freeze blob: `e53c6a2418edef9399b524da57bb129a703cb85a`
- development result blob: `ebbd3aa66f1484bca7063d4576b45e3c955cf7c6`
- v12 protocol blob: `686775476ed8c8c910ad08ac371cedde191de3c9`
- selected-method implementation blob: `82d63707bb413ebc2cb1e4b0173283127e0c98ef`

Calibration v11 remains **failed-confirmatory**.

## Frozen method

`domain-loo-eap-fixed-theta`

For each target item:

1. exclude the target item from its own matching score;
2. fit a unidimensional 2PL model to the other six items in the same domain;
3. estimate participant EAP theta;
4. hold that theta fixed;
5. run `lordif::rundif` on the target item;
6. do not feed DIF flags back into theta estimation.

The development runner-up cannot replace this method after confirmatory execution starts.

## Confirmatory design

Two independent synthetic panels are reserved.

### Clean panel

- 5 replicates
- 1,200 participants per replicate
- 6 domains × 7 items = 42 target items
- pipeline panel
- discrimination multiplier = 2.0
- no implanted Age-DIF
- reserved seeds: `cil-v12-confirm-clean-r01` through `r05`

### Implanted-DIF panel

- 5 replicates
- 1,200 participants per replicate
- 6 domains × 7 items = 42 target items
- one implanted Age-DIF control per domain
- implanted effect = 0.70
- reserved seeds: `cil-v12-confirm-implanted-r01` through `r05`

These seed families are independent of all development seed families and remain **unused**.

## Frozen acceptance rule

A confirmatory PASS requires all of the following:

- all 10 replicates complete;
- every clean replicate has `difFlag` false-positive rate `<= 0.10`;
- aggregate implanted-DIF sensitivity is `>= 0.70`;
- selected method remains unchanged;
- no runner-up fallback;
- no post-execution threshold changes;
- no inference from a partial run.

Fixed DIF settings remain:

- criterion: `Chisqr`
- alpha: `0.01`
- pseudo-R²: `McFadden`
- delta-R² reference diagnostic: `0.02`

## Execution lock

This preregistration intentionally includes **no confirmatory runner and no confirmatory execution workflow**.

Current state:

- confirmatory execution authorized = **false**
- confirmatory seeds consumed = **false**
- separate execution authorization required = **true**

The next technical step after this preregistration is reviewed is to implement and validate a runner
that is mechanically constrained to this design. That runner may be dry-run/syntax tested, but the
reserved confirmatory seeds must remain inaccessible to execution until a separate explicit authority
is recorded.

## Governance

Still locked:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- norm publication = disabled

A future synthetic confirmatory PASS would not establish real-user fairness, population norms, or
formal IQ validity.
