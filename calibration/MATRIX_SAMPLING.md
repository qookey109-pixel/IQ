# Calibration Matrix Sampling v1

Version: `CIL-MATRIX-2026.09.1`

## Purpose

The public assessment remains exactly 42 scored questions. Matrix sampling is an optional research mode that changes **which** valid 42-item form a participant receives; it does not change CPI scoring.

## 56-slot cycle

Each research slot keeps the production blueprint:

- 6 cognitive domains
- 7 task families per domain
- 7 items per domain
- 2 easy / 3 medium / 2 hard per domain
- 42 scored items total

The scheduler builds all 56 slots deterministically. For each domain and slot it chooses a legal family-to-difficulty assignment, then rotates through concrete items inside each family/difficulty cell. Selection pressure favors exposure proportional to the available item pool, while the fixed 2/3/2 blueprint remains authoritative.

A pseudonymous local `sourceKey` maps to a stable slot using a versioned hash. A later matrix epoch may rotate which concrete items occupy the same schedule without changing the meaning of historical form IDs.

Form IDs use:

`matrix:CIL-MATRIX-2026.09.1:epoch-<n>:slot-<00..55>`

## Stable anchor reserve

Six medium-difficulty items—one per domain—are reserved as the common post-test anchor block. They remain part of the 2,058-item bank but are excluded from scored forms, leaving 2,052 active candidates for scored-form selection.

The anchor block is still unscored and opt-in. Its purpose is common-item linking across matrix slots and ordinary randomized forms.

## Why 56 slots

Non-verbal QB5 task families currently contain 56 concrete items each. A 56-slot research cycle therefore provides a natural scheduling horizon for spreading exposure while still respecting the fixed family and difficulty blueprint. Because difficulty quotas do not exactly match the raw easy/medium/hard proportions in every family, matrix sampling aims for broad, controlled exposure—not a claim that every item appears exactly once per cycle.

## Safety

- Matrix mode does not modify answer keys.
- Matrix mode does not change CPI scoring.
- Matrix mode does not generate or unlock IQ.
- Stable anchor items do not enter the scored 42-item form.
- All matrix forms must pass the same Oracle, option-quality, construct, timing, Safari, and final production constraints as ordinary forms.
