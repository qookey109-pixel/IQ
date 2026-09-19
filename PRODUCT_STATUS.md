# Cognitive IQ Lab — Product Status

Status date: **2026-09-19 Asia/Taipei**  
Release candidate: **RC-2026.09.19-1**  
Repository authority: **current `main`**  
RC branch base: `7ce6eb2caef725a9d0e1c19a0090dc04684a5be3`

## Active product

- Product: IQ-style cognitive assessment / self-exploration
- Production bank: **2,058 items**
- Construct templates: **294**
- Task families: **42**
- Production form: **42 items = 6 domains × 7 families**
- Difficulty blueprint per domain: **2 easy + 3 medium + 2 hard**
- Public score: **Cognitive Performance Index (CPI) 0–100**
- Scoring: **Scoring v2**, experimental and not population normed
- Processing-speed share: **5% within the processing-speed domain**, only after a correct timed response

## Product governance locks

These remain closed:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`
- `iqConversionEnabled=false`
- `populationPercentileAvailable=false`

The product does **not** publish IQ conversion, population percentile, age-peer ranking, diagnosis, educational placement, or employment conclusions.

## Release-candidate evidence

The active RC is protected by:

- 2,058-item / 42-item production validation
- independent answer oracle and answer-position balance
- 42-item single-spec guard
- Scoring v2 boundary validation
- Measurement Hardening v1
- timing deadline / timeout regression
- CPI-only fallback guard across app + timing + final quality layers
- release UX smoke validation
- pretest / practice isolation validation
- single-screen / navigation / matrix viewport guards
- Jekyll production bundle render validation
- cache-busted RC assets: `20260919-rc1`

## Frozen research lineage

Calibration v13 / IRB / real-participant norming work remains preserved for research lineage but is **frozen** and does not block product development or this CPI-only release candidate.

Historical calibration workflows and evidence are not deleted because they remain reproducibility/audit records. They are not the active product authority.

## RC boundary

This RC is an engineering release candidate. It does **not** establish population reliability, criterion validity, IRT/CAT equating, clinical validity, or an IQ norm.

A successful Product Release Candidate Gate means the current static product bundle and guarded runtime are internally consistent; it is not a substitute for external human validation or manual testing on every physical browser/device.
