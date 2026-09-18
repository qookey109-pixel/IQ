# Calibration v13 — Taiwan Activation-Readiness Guard

Status: **guard defined — collection remains locked**

This guard answers one narrow question:

> Are all frozen design prerequisites present such that a separate activation authorization may be considered?

It does **not** answer “may collection start now?”

## Output states

Only two readiness states exist:

- `NOT_READY`
- `READY_FOR_SEPARATE_ACTIVATION_AUTHORIZATION`

There is deliberately no `AUTHORIZED`, `ACTIVE`, or `COLLECTING` state.

Every result also carries:

- `collectionAuthorized=false`
- `recruitmentLaunchAuthorized=false`
- `schemaActivationAuthorized=false`
- `productIqUnlocked=false`

## Reproducible date handling

The checker requires an explicit evaluation date:

`node scripts/check-v13-taiwan-activation-readiness.js --as-of YYYY-MM-DD`

CI pins the current protocol review snapshot to **2026-09-19**.

The Taiwan population benchmark is dated **2026-08-31** and is considered fresh for at most 120
days under the frozen target-population protocol.

Boundary tests prove:

- 2026-12-29 → 120 days → fresh
- 2026-12-30 → 121 days → expired

No hidden wall-clock dependency changes historical CI results.

## Hard prerequisites

The guard checks:

1. exact authority blob pins;
2. Taiwan target population is complete and `zh-Hant-TW`;
3. benchmark freshness;
4. ethics / IRB / REC applicability determination has a documented resolved state;
5. consent artifact and version are pinned;
6. schema/privacy amendment version is pinned;
7. proposed Taiwan schema v2 is present;
8. recruitment/consent plan is pinned;
9. retention and deletion rules are defined.

## Current result

At the frozen 2026-09-19 review snapshot, all machine-checkable design prerequisites pass **except**
the ethics determination.

Current ethics status:

`unset`

Therefore the expected guard result is:

`NOT_READY`

with blocker:

`ethicsDeterminationResolved`

## Intentional locks are safety checks

Before activation, these are expected to remain false:

- schema activation
- production exporter modification
- pooling runtime modification
- recruitment launch
- consent-page activation
- real-participant collection
- participant-data access
- Phase A analysis
- Phase B collection
- Phase B norm estimation
- backend collection

The active pooled schema is also expected to remain v1.

If any of these becomes active before a separate authorization, the guard fails closed.

## Governance

The guard also proves:

- `autoPublishNorms=false`
- `autoCpiToIq=false`
- `productNormEligible=false`
- `productIqUnlocked=false`

A future `READY_FOR_SEPARATE_ACTIVATION_AUTHORIZATION` result is only a readiness signal. It cannot
authorize collection, publish norms, or unlock IQ.
