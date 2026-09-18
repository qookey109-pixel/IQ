# Calibration v12 — Confirmatory Runner Guard

Status: **implementation prepared; execution still locked**

This runner implements the frozen v12 confirmatory design without granting execution authority.

## Safety boundary

The runner supports only:

- full 10-replicate confirmatory execution; or
- `--dry-run` planning.

It intentionally rejects panel, replicate, sample-size, target-count, threshold, method, and seed override arguments.

Before any synthetic participant data is generated, non-dry-run execution requires:

`calibration/v12-confirmatory-execution-authority.json`

That file is intentionally absent from this implementation branch.

A future authority record must explicitly confirm:

- `executionAuthorized=true`
- explicit user execution authorization recorded
- scope = all 10 preregistered replicates
- selected method = `domain-loo-eap-fixed-theta`
- exact preregistration Git blob hash
- exact runner Git blob hash
- exact selected-method R analysis Git blob hash

Without that record, execution fails before creating the output directory.

## Selected-method-only analysis

The confirmatory R analysis contains only the frozen
`domain-loo-eap-fixed-theta` path.

It does not run:

- the iterative `lordif` development reference;
- the six-factor MAP development runner-up.

This prevents a confirmatory run from silently substituting or comparing alternate methods.

## Data handling

If future execution is separately authorized:

- raw synthetic participant/session files live only in a private working directory;
- each replicate is read into aggregate counts and then deleted;
- the working directory is deleted again in a final cleanup block;
- the persistent output is the aggregate 10-replicate confirmatory summary.

No current CI step executes these confirmatory seeds.

## Current governance

Still false:

- `productNormEligible`
- `productIqUnlocked`
- `autoCpiToIq`

Calibration v11 remains failed-confirmatory. A future v12 synthetic confirmatory pass would not by
itself establish real-user fairness, population norms, or formal IQ validity.
