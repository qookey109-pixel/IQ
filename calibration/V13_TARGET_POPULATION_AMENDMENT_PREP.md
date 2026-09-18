# Calibration v13 — Target-Population Amendment Preparation

Status: **incomplete proposal — real-participant collection remains locked**

Calibration v13 requires a named target population before any real-participant collection can be
authorized. This preparation step defines the amendment fields and hard guards, but deliberately
does **not** choose the population on the user's behalf.

## Current authority

- basis main: `3785342405cfd516323cdba6e7142a51e3dfce81`
- v13 protocol blob: `7dd6e940e2c188dd7bbbbf91f0df26ad75da2f4f`
- readiness policy blob: `5c992e16e12bcba9cdbaa7c941782f5a14667fe7`
- pooled-study policy blob: `d87e6ad056eac9fb905ae90727a92beeb4385e7a`
- current response schema blob: `fab3c9f10b11f640490b77f55f41beab064a338c`

## Fields that must be frozen before collection

The completed amendment must name:

- jurisdiction / population scope
- explicit population definition
- production language version
- residency or eligibility rule
- sampling-frame reference and version
- population benchmark source and version
- benchmark reference date
- weighting method and any trimming rule
- recruitment channels and allocation rule

Until those fields are frozen, no sample may be described as representative population norms.

## Current schema boundary

The current pooled response schema includes whole-year age and the five supported age bands. It
does not include additional norming demographics.

Therefore additional benchmark dimensions such as education, sex, region, language background, or
other characteristics are **not automatically authorized**.

Before collecting any new demographic dimension, a separate amendment must:

1. justify why the dimension is required for the named target population;
2. define a coarse, privacy-preserving field;
3. update the schema prospectively;
4. document consent / privacy handling;
5. pass ethics or IRB determination when applicable.

No direct identifiers, date of birth, IP address, precise location, account ID, or automatic upload
are authorized.

## Representative-sampling rule

The Phase B planning floors remain:

- >= 5,000 independent participants
- >= 500 per age band
- all 56 Matrix slots
- >= 80% Anchor completion
- average formal-item exposure >= 80

These are **readiness floors**, not proof of representativeness.

Meeting age quotas or reaching 5,000 participants alone may not be described as representative.
The completed amendment must define the relationship between recruitment, the sampling frame,
population benchmarks, weighting, and effective sample size.

## Weighting must be prospective

The weighting method is intentionally unset here.

The completed amendment must specify it before collection. Post-hoc selection of a weighting method
based on which method makes the sample or score distribution look best is not allowed.

Both weighted and unweighted distributions must be reported, together with effective sample size
after weighting.

## Version freeze

Before Phase B:

- bank version must be frozen
- scoring version must be frozen
- measurement model must be frozen

A later prompt, answer-key, scoring, or model change invalidates the norming cohort for the changed
version and requires a new protocol version / cohort.

## Current locks

Still false:

- real-participant collection authorization
- participant-data access authorization
- Phase A analysis authorization
- Phase B collection authorization
- Phase B norm estimation authorization
- backend collection authorization
- additional-demographics collection authorization
- `productNormEligible`
- `productIqUnlocked`
- `autoCpiToIq`

## Next decision boundary

The next substantive decision is to fill the target-population amendment with a specific
jurisdiction, production language, official/documented benchmark source, sampling frame, and
weighting plan.

That choice should be made prospectively before any real-participant recruitment begins.
