# Calibration v13 — Taiwan Applicant Context Intake

Status: **intake defined — applicant context still missing — board selection locked**

The repository now contains a privacy-preserving template and checker for the real applicant
information required before IRB/REC route verification can proceed.

The **completed** applicant record must not be committed to public Git.

## Why this layer exists

The current candidate matrix cannot safely choose a board because board eligibility depends on the
actual applicant:

- institution-affiliated vs unaffiliated;
- PI legal identity and role;
- official research/data-rights contacts;
- funding declaration;
- conflict-of-interest declaration;
- potentially ethics-training and institutional-authorization requirements.

Those facts cannot be inferred from GitHub account metadata, prior chat, or memory.

## Private applicant-context template

Template:

`calibration/v13-taiwan-applicant-context-intake.template.json`

The public repository keeps only an **unfilled** template.

A completed private record must remain outside public Git.

The template does **not** require:

- government ID;
- date of birth;
- home address.

## Minimum fields

Required before the context can become ready for board verification:

- PI legal name;
- PI title/role;
- route:
  - `institution-affiliated`, or
  - `unaffiliated-investigator`;
- official research contact;
- official data-rights contact;
- funding declaration;
- COI declaration.

If route is `institution-affiliated`, institution legal name is also required.

If funding is `external-funded`, the funder legal name is required in the private record.

If a COI is declared, a private details-record reference is required.

## Checker

`node scripts/check-v13-taiwan-applicant-context.js`

Without `--input`, it evaluates the public blank template and must return:

`APPLICANT_CONTEXT_INCOMPLETE`

A future private record can be checked locally with:

`node scripts/check-v13-taiwan-applicant-context.js --input /private/path/context.json`

A complete record can only advance to:

`APPLICANT_CONTEXT_READY_FOR_BOARD_VERIFICATION`

It does **not** select a board.

## What still happens after applicant context is complete

Each candidate still requires direct verification of:

1. current qualified status;
2. external/unaffiliated intake acceptance;
3. online behavioral/psychometric scope;
4. submission process;
5. fees;
6. ethics-training requirements;
7. institutional-authorization requirements.

## Hard locks

At this stage:

- `selectedBoard=null`
- ranking disabled;
- automatic board selection disabled;
- external-board contact unauthorized;
- submission unauthorized;
- recruitment/collection unauthorized;
- schema activation unauthorized;
- IQ unlock remains false.
