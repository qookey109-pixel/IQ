# Calibration v11 — Preregistered Reliability-Screen Discrimination

Status: **preregistered before first execution**

Basis main: `9182f0fa805a83ccdf8c268a04aa191e34eca528` (Calibration v10 merged baseline).

## Question

Can the existing full psychometric pipeline correctly distinguish two prospectively specified synthetic conditions using the already-versioned reliability screen, while the rest of the structural pipeline remains healthy?

This is a method-validation question only. It is not a claim about real users, population norms, external validity, or IQ calibration.

## Why this stage exists

Calibration v10 showed stable end-to-end software behavior, but its bounded seven-item-per-domain synthetic panel produced omega values below the existing `minimumOmegaTotal = 0.70` engineering screen. That limitation is retained as evidence rather than being rewritten after inspection.

v11 therefore uses two controls:

- **weak-control** — the existing clean pipeline synthetic model (`itemDiscriminationMultiplier = 1.0`), expected to fail the `.70` reliability screen;
- **high-information-control** — the same clean 42-item / six-domain panel with a prospectively fixed item-discrimination multiplier of `2.0`, expected to pass the `.70` reliability screen.

The point is discrimination, not creating a synthetic condition that is treated as product evidence.

## Frozen design

Each condition uses:

- 3 independent deterministic replicates;
- 1,200 synthetic participants per replicate;
- 42 administered items total, 7 per domain;
- the same clean `pipeline` item surface used for v10, with no deliberate low/negative-discrimination or age-DIF control items;
- fixed seed prefixes recorded in `calibration/confirmatory-reliability-v11.json`.

The thresholds are inherited from the existing psychometric readiness policy wherever applicable:

- minimum omega total: `0.70`;
- configural CFI: `>= 0.90`;
- configural RMSEA: `<= 0.08`;
- absolute metric/scalar delta-CFI: `<= 0.01`;
- clean-panel Age-DIF false-positive rate: `<= 0.10`.

Every replicate must remain structurally complete, meet the existing CFA and clean-DIF screens, and match its preregistered reliability classification. One unexpected replicate is a v11 failure, not a reason to change thresholds after execution.

## Immutability rule

The preregistration JSON is frozen before the first v11 execution. The runner must verify its SHA-256 against the value pinned in code. Any threshold/design edit after results exist requires a new protocol version and fresh seed family; it cannot be presented as the original confirmatory test.

## Governance locks

All remain closed throughout v11:

- `productNormEligible = false`
- `productIqUnlocked = false`
- `autoCpiToIq = false`
- `autoPublishNorms = false`
- automatic participant upload = false
- real participants = none

A v11 PASS cannot unlock IQ reporting or product norms.

## Interpretation boundary

A v11 PASS would establish only that the current engineering pipeline and `.70` reliability screen can prospectively distinguish the specified synthetic weak/high-information conditions while other existing structural checks remain stable.

It would still leave the real-product requirements unchanged: independent representative participants, real reliability, IRT stability, fairness/DIF resolution, factor/invariance evidence, external/convergent validity, age norms with uncertainty, and human psychometric review.
