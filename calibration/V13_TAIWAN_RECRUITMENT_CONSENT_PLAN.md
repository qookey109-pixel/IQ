# Calibration v13 — Taiwan Recruitment / Consent Execution Plan

Status: **plan frozen — recruitment and collection remain locked**

This layer defines how a future Taiwan real-participant study may recruit, obtain consent, prevent
avoidable duplicate enrollment, retain/delete participant-level research data, and stop collection
if governance drifts.

It does not launch recruitment.

## Ethics gate

Before the first participant:

- a documented human-research applicability determination is required;
- IRB/REC review is required when applicable;
- the approved, exempt, or otherwise documented determination version must be recorded;
- this repository plan is not itself an ethics approval.

The collection guard must fail closed while that determination is unset.

## Recruitment

Frozen frame:

`CIL-V13-TW-MULTISOURCE-ONLINE-FRAME-2026.09.1`

Minimum three active channel classes:

1. general-population / research online panel;
2. broad digital advertising;
3. community / public outreach.

No single channel may exceed 60% of the unweighted independent cohort.

The design remains nonprobability multisource online recruitment. Recruitment material may not
promise an IQ score, diagnosis, clinical benefit, or guaranteed personal benefit.

Participant compensation is **not authorized** in this plan. If compensation is later desired,
its amount, delivery, tax/privacy handling, and coercion review require a separate amendment.

## Anti-duplication without surveillance

The primary independence unit remains `sourceKey`.

A future launch may also use a non-identifying one-time recruitment token. Only a salted token hash
may be retained for operational deduplication, and that hash is deleted within 30 days after
redemption.

Prohibited duplicate controls:

- IP-address tracking;
- device fingerprinting;
- account identity;
- email identity.

Because these privacy-preserving rules cannot perfectly detect a person who deliberately enters
through multiple devices/channels, residual duplicate risk must be reported rather than hidden.

## Consent version

Frozen consent draft:

`CIL-V13-TW-CONSENT-2026.09.1`

File:

`calibration/V13_TAIWAN_PARTICIPANT_CONSENT_ZH_HANT_TW.md`

Consent must happen before research metadata or item responses are recorded.

The participant must be told that CPI is not IQ and that participation does not unlock IQ.

## Retention

Participant-level research records:

**maximum 5 years after formal study closure**

One-time recruitment-token salted hashes:

**maximum 30 days after redemption**

Aggregate-only reports that no longer contain participant-level records may be retained.

If an ethics/IRB determination requires a different retention rule, the protocol and consent must be
amended **before collection**.

## Deletion / withdrawal

The participant may request deletion of identifiable-by-pseudonym research records before the
retention period ends.

Lookup uses:

- `sourceKey`
- `sessionId`

A request must not require name, email, account identity, government ID, or IP address.

Target operational SLA: 30 calendar days.

Aggregate outputs that no longer contain participant-level records are not reconstructed merely to
remove one already-aggregated contribution.

## Stop rules

Future collection must stop if any of the following occurs:

- ethics determination missing/expired;
- consent version drift;
- population benchmark expiry;
- active schema differs from the approved schema;
- automatic upload appears without separate authorization;
- a direct identifier appears in a research export;
- a single recruitment channel exceeds the 60% cap;
- an unexpected privacy incident occurs.

Resumption requires documented review and a versioned amendment when applicable.

## Runtime boundary

Still inactive:

- proposed Taiwan schema v2;
- production exporter changes;
- pooling runtime changes;
- recruitment launch;
- consent page activation;
- backend collection.

## Product governance

Still locked:

- `productNormEligible=false`
- `productIqUnlocked=false`
- `autoCpiToIq=false`
- no population-norm claim.

## Next gate

After this plan is merged, the next safe engineering step is an **activation-readiness guard** that
checks all required prerequisites (ethics determination, consent version, benchmark freshness,
schema version, recruitment plan, retention/deletion policy) without launching collection.

Actual recruitment/collection remains a separate explicit authorization boundary.
