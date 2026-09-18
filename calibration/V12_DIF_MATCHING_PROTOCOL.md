# Calibration v12 — Prospective DIF Matching Recovery Protocol

Status: **prospective method-selection protocol; no v12 analysis has been executed**

Basis main: `c830e48c2170d0bab5341506487f36c6ae7f88d2`

Historical authorities:

- frozen v11 confirmatory head: `586f22d4b2ec405ae5ffd68def0f00f5b3423c73`
- v11 post-failure diagnostic head: `70d3f9af15c57cb4e33447d050f21e2bdf1320ef`
- v11 verdict: **failed-confirmatory (unchanged)**

## Scientific question

Can a target-independent matching variable control clean-panel Age-DIF false positives under the exact short-form regime that failed v11, while preserving useful sensitivity to known implanted Age-DIF?

This is a synthetic method-recovery study only. It is not real-user fairness evidence, population norming, external validity, or IQ calibration.

## Why v12 exists

The v11 confirmatory study correctly remains failed because high-information replicate 1 produced:

- clean Age-DIF flags: `5 / 42`
- false-positive rate: `0.119047619...`
- frozen maximum: `.10`

Post-failure diagnostics then isolated a plausible mechanism:

`true theta -> response-estimated theta -> self-inclusion -> purification amplification`

The diagnostic evidence showed:

- known true theta: `0 / 42` material DIF signals
- pipeline EAP: `2 / 42` material signals
- final lordif result: `5 / 42` material signals

Leave-one-item-out matching reduced the two initially material target signals, but the six-item residual matching scale remained noisy enough to leave a small age-band location signal in at least one domain.

v12 therefore changes the **prospective matching method**, not the historical v11 result or threshold.

## Fixed boundaries

The following remain unchanged throughout v12:

- `criterion = "Chisqr"`
- `alpha = .01`
- `pseudo.R2 = "McFadden"`
- McFadden `delta-R2 = .02` remains a secondary material-effect diagnostic
- the primary clean-panel gate remains the existing `difFlag` false-positive rate
- maximum clean-panel `difFlag` rate remains `.10`

v12 may not:

- reinterpret v11 as PASS
- change v11 seeds
- change the v11 `.10` clean-DIF threshold
- silently switch methods after confirmatory results are observed

## Method-development panels

Development uses new seed families that are not eligible to become confirmatory evidence.

### Clean panel

The clean panel preserves the v11 failure regime:

- 6 domains
- 7 target items per domain
- 42 target items total
- 1,200 synthetic participants per replicate
- high-information discrimination multiplier `2.0`
- no implanted Age-DIF
- 5 deterministic development replicates
- seed prefix `cil-v12-dev-clean`

### Implanted-DIF panel

Sensitivity is checked against the already-versioned v9 recovery truth rather than inventing a new DIF mechanism after v11:

- 6 domains
- 7 target items per domain
- one implanted Age-DIF control per domain
- implanted effect `ageDif = 0.70`
- 1,200 synthetic participants per replicate
- 5 deterministic development replicates
- seed prefix `cil-v12-dev-implanted`

## Matching methods

### Reference baseline — current lordif iterative path

`lordif-iterative-current`

This reproduces the current iterative matching/purification behavior and is retained only as a reference. It is **not selectable** as the v12 recovery method because it does not remove the mechanism v12 is specifically testing.

### Candidate A — domain leave-one-out fixed theta

`domain-loo-eap-fixed-theta`

For each target item:

1. remove the target item from its domain matching set;
2. fit a unidimensional 2PL model to the remaining six domain items;
3. estimate EAP theta;
4. hold that theta fixed;
5. run `lordif::rundif` for the target item;
6. do not feed target-item DIF flags back into theta estimation.

This candidate directly removes target self-inclusion, but it intentionally retains the short six-item information limit so that v12 can test whether removing feedback alone is sufficient.

### Candidate B — cross-fit correlated six-factor fixed theta

`crossfit-six-factor-eap-fixed-theta`

For each target item:

1. remove the target item from the response matrix;
2. fit a correlated six-factor 2PL model to the remaining 41 responses;
3. estimate participant EAP scores for the six latent domains;
4. use the target item's domain-factor score as the matching theta;
5. hold that theta fixed;
6. run `lordif::rundif` for the target item;
7. do not feed target-item DIF flags back into theta estimation.

This candidate keeps the target item out of its own matching variable while allowing the correlated-domain model to borrow information from the broader response pattern.

## Prospective selection rule

A selectable candidate must:

- complete all 5 clean and all 5 implanted-DIF development replicates;
- keep **every clean replicate** at or below `.10` primary `difFlag` false-positive rate;
- achieve aggregate implanted-DIF sensitivity of at least `.70`.

The `.70` sensitivity floor is specified before v12 execution and is anchored to the previously observed v9 known-truth result. It is a v12 method-selection criterion, not a product-validity threshold.

Secondary diagnostics are recorded but cannot be used to invent a new pass rule after results exist:

- material McFadden delta-R2 flag rate;
- theta correlation with known synthetic truth;
- theta RMSE against known truth;
- maximum absolute age-band mean theta bias.

If both candidates pass, selection is deterministic:

1. lower worst clean-replicate `difFlag` rate;
2. if tied, higher aggregate implanted-DIF sensitivity;
3. if still tied, prefer `domain-loo-eap-fixed-theta` because it is the lower-complexity method.

If neither candidate passes, v12 method selection fails. No threshold relaxation is allowed.

## Confirmatory boundary

No v12 confirmatory seed may run until:

1. development implementation exists;
2. the selected method is determined by the rule above;
3. the selected method implementation is frozen;
4. the protocol/config hash and implementation commit are pinned;
5. a separate independent confirmatory seed family is retained unused.

The later confirmatory stage is prospectively defined as:

- 5 clean replicates × 1,200 participants;
- 5 implanted-DIF replicates × 1,200 participants;
- independent seed prefixes:
  - `cil-v12-confirm-clean`
  - `cil-v12-confirm-implanted`
- every clean replicate must remain `<= .10` primary `difFlag` FPR;
- aggregate implanted-DIF sensitivity must remain `>= .70`;
- all replicates must complete;
- no runner-up fallback if the selected method fails confirmatory validation.

A confirmatory failure remains a failure.

## Governance locks

All remain closed:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- `autoPublishNorms = false`
- automatic participant upload = false
- real participants = none

A future v12 PASS would validate only the synthetic DIF matching method under the preregistered known-truth design.

It would not:

- repair or overwrite v11;
- establish fairness in real participants;
- establish population norms;
- establish IQ validity;
- unlock CPI-to-IQ conversion.

## Method rationale

The `lordif` framework uses an IRT-derived matching criterion and iterative purification. That approach is appropriate in many DIF settings, but published methodological work also notes that matching-variable construction matters and that short scales can make DIF conditioning less stable. Purification can help under some conditions, but its behavior depends on test length, group differences, and the quality of the matching variable.

v12 therefore does not declare purification generally wrong. It tests the narrower project-specific hypothesis suggested by the v11 evidence: **under this 7-item-per-domain synthetic regime, target self-inclusion plus short-scale estimated-theta feedback may inflate clean-panel DIF flags.**

References used for method rationale:

- Choi, Gibbons & Crane (2011), *lordif: An R Package for Detecting Differential Item Functioning Using Iterative Hybrid Ordinal Logistic Regression/Item Response Theory and Monte Carlo Simulations*.
- Scott et al. (2010), *Differential item functioning (DIF) analyses of health-related quality of life instruments using logistic regression*.

## Current disposition

This commit freezes the **design logic only**.

No v12 development simulation has been run yet.

The next allowed technical step is:

`implement development-only matching comparison -> validate locally/CI -> inspect development results -> freeze one selected method -> only then prepare independent confirmatory execution`
