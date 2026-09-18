# Calibration v13 — Taiwan Ethics / IRB Applicability Determination Packet

Status: **prepared for formal determination — ethics unresolved — collection locked**

This packet is designed to support a formal determination by a qualified Taiwan IRB/REC or
independent review board. It is **not** an approval, exemption certificate, expedited-review
decision, or collection authority.

## Working classification

The project should be presented to the review board as **presumptive human-subjects research**,
because it prospectively recruits living adults and collects/analyzes cognitive-test responses and
other psychological/behavioral research information.

The project must **not self-declare**:

- exempt;
- expedited;
- IRB approved;
- minimal-risk as a final regulatory determination.

The planned design is intended to be minimal risk, but the review board determines the actual
category.

## Regulatory basis

Primary source: Taiwan **Human Subjects Research Act / 人體研究法**.

Relevant provisions captured in the machine-readable packet:

- Article 4 — human-subjects research includes research using personal behavioral and psychological information;
- Article 5 — prior ethics review is required unless an official exemption applies;
- Article 6 — required research-plan contents;
- Article 9 — unaffiliated researchers may seek review from a research-institution IRB or independent IRB;
- Articles 12 and 14 — participant consent and required disclosure;
- Article 19 — handling/destruction of research materials after study/retention.

Official Ministry of Health and Welfare notices also define possible expedited-review and exemption
categories. This project requests a board determination instead of claiming either category.

## Project summary

**Project:** Cognitive IQ Lab — Calibration v13

**Population:** Taiwan household-registered adults, age 18–65, able to independently read
Traditional Chinese.

**Language:** `zh-Hant-TW`

**Study type:** prospective, noninterventional online psychometric validation with a later,
independent representative-norming phase.

No physical intervention, medical treatment, or clinical diagnosis is planned.

Research tasks include:

- 42 scored cognitive items;
- optional six-domain anchor research block under separate opt-in where applicable;
- whole-year age and coarse weighting metadata;
- reliability, IRT, DIF/fairness, CFA, linking, and later norming analyses.

Phase A planning floor: >= 2,500 independent participants, >= 250 per age band.

Phase B planning floor: >= 5,000 new independent participants, >= 500 per age band.

Phase B remains separately gated and inactive.

## Foreseeable risk

Primary anticipated risks:

- confidentiality/privacy exposure;
- psychological discomfort from cognitive-performance feedback;
- misinterpretation of CPI as IQ;
- subgroup fairness/discrimination risk if findings are overgeneralized or misused.

Mitigations include data minimization, aggregate-only reporting, no automatic upload, no direct
identifiers, explicit CPI-not-IQ language, refusal options for weighting metadata, and fail-closed
collection stop rules.

## Research data

Allowed participant-level research fields are limited to pseudonymous identifiers, whole-year age,
age band, household-registration eligibility, sex-for-weighting, macro region, and assessment
response records.

Prohibited:

- name;
- email;
- account ID;
- phone;
- date of birth;
- IP address;
- precise location;
- street address;
- raw county/city.

Participant-level research data are planned for no more than five years after formal study closure,
subject to any stricter IRB/REC requirement.

## Recruitment

Planned nonprobability multisource online frame:

1. general-population/research online panel;
2. broad digital advertising;
3. community/public outreach.

At least three classes must be active and no single class may exceed 60% of the unweighted
independent cohort.

No compensation is authorized in the current plan.

Recruitment material may not promise an IQ result, diagnosis, treatment, or guaranteed benefit.

## Consent

Draft:

`CIL-V13-TW-CONSENT-2026.09.1`

Consent must occur before research metadata or responses are recorded.

The consent explains that CPI is not IQ, participation does not unlock IQ, participation is
voluntary, stopping carries no penalty, and the currently authorized architecture does not
automatically upload research data.

## Questions to the IRB / REC

The packet explicitly asks the board to determine:

1. whether the planned study is regulated human-subjects research;
2. the appropriate review category;
3. whether Phase A and later Phase B may sit under one protocol or require a new application/amendment;
4. whether the consent wording and demographic refusal options are acceptable;
5. whether the planned retention period is acceptable;
6. whether sourceKey/sessionId plus short-lived salted recruitment-token hash is acceptable for deduplication;
7. whether additional contact, complaint, injury/remedy, or data-controller language is required;
8. whether any protected/vulnerable-population exclusions or handling are required.

## Administrative fields still unresolved

This packet is **not yet submission-ready** because the following must come from the actual
investigator/submission context and must not be guessed:

- principal investigator legal name;
- title/role;
- research institution or unaffiliated-investigator route;
- selected qualified IRB/REC;
- official research contact;
- official data-rights contact;
- funding/no-funding declaration;
- conflict-of-interest declaration.

After an external board issues a documented determination, the determination reference number,
version/date, review category, conditions, and expiry (if any) may be recorded.

Until then:

`determination.status = "unset"`

## Hard locks

Still false:

- schema activation;
- recruitment launch;
- consent-page activation;
- real-participant collection;
- participant-data access;
- Phase A analysis;
- Phase B collection;
- Phase B norm estimation;
- backend collection;
- `productNormEligible`;
- `productIqUnlocked`;
- `autoCpiToIq`.

No repository change in this packet may set the ethics determination to approved/exempt without an
external documented decision.
