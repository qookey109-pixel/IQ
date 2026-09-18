# Calibration v13 — Taiwan Ethics Submission Administration

Status: **administration prepared — not submission-ready**

This layer prepares the administrative shell needed to move the ethics packet toward a real review
board without guessing identity, affiliation, contact details, funding, conflicts, or board choice.

It does not submit anything.

## Official review-board source of truth

Use the current Ministry of Health and Welfare, Department of Medical Affairs directory:

`https://dep.mohw.gov.tw/DOMA/lp-3131-106.html`

The directory page was rechecked on 2026-09-19 and showed a last-update date of 2026-09-15.

Do not freeze a board merely because it appeared on an older annual list. Selection must confirm the
board's current qualified status and validity period at the time of submission.

## Board-selection rules

A selected board must satisfy all of the following:

- current qualified/valid status;
- accepts the investigator's actual institutional or unaffiliated route;
- scope fits online behavioral / psychometric human research;
- submission process is publicly available or otherwise documented;
- fees and contractual requirements are reviewed before selection;
- no unresolved conflict of interest.

The repository does not rank IRBs/RECs or pick one automatically.

## Administrative fields that still require real-world input

Still blank:

- PI legal name;
- PI title/role;
- institution or unaffiliated-investigator route;
- selected qualified IRB/REC;
- official research contact;
- official data-rights contact;
- funding/no-funding declaration;
- conflict-of-interest declaration;
- submission portal/method;
- institutional authorization if required.

These must come from the actual submission context.

## External decision intake

A new template is added:

`calibration/v13-taiwan-ethics-decision-intake.template.json`

A resolved status may be one of:

- `documented-approved`
- `documented-exempt`
- `documented-not-requiring-irb-rec`

But a resolved status is invalid unless external decision evidence is present.

Required evidence metadata:

- review board;
- reference number;
- decision date;
- SHA-256 of the external decision document;
- local/non-public record reference for the decision document.

The external decision document itself must not be committed to public Git by default.

## Critical separation

An ethics determination is **not** the same thing as collection authorization.

Even after a valid external determination is received, all of these remain separate controls:

- schema activation;
- recruitment launch;
- consent-page activation;
- real-participant collection;
- participant-data access;
- Phase A analysis;
- Phase B collection;
- Phase B norm estimation.

## Current state

`submissionReady=false`

`ethics status=unset`

`submissionToExternalBoardAuthorized=false`

`realParticipantCollectionAuthorized=false`

`productIqUnlocked=false`
