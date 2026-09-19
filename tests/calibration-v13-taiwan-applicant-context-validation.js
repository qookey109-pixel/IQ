'use strict';

const assert = require('assert');
const path = require('path');
const guard = require('../scripts/check-v13-taiwan-applicant-context.js');
const policy = require('../calibration/v13-taiwan-applicant-context-readiness-policy.json');
const template = require('../calibration/v13-taiwan-applicant-context-intake.template.json');

assert.strictEqual(
  policy.authority.submissionAdministrationBlobSha,
  guard.gitBlobSha(path.join(__dirname, '..', 'calibration', 'v13-taiwan-ethics-submission-administration.json'))
);
assert.strictEqual(
  policy.authority.candidateMatrixBlobSha,
  guard.gitBlobSha(path.join(__dirname, '..', 'calibration', 'v13-taiwan-irb-rec-candidate-matrix.json'))
);

const blank = guard.validateContext(template);
assert.strictEqual(blank.valid, true);
assert.strictEqual(blank.status, 'APPLICANT_CONTEXT_INCOMPLETE');
assert.ok(blank.missing.includes('principalInvestigator.legalName'));
assert.ok(blank.missing.includes('principalInvestigator.route'));
assert.ok(blank.missing.includes('contacts.officialResearchContact'));
assert.strictEqual(blank.boardSelected, false);
assert.strictEqual(blank.submissionAuthorized, false);
assert.strictEqual(blank.collectionAuthorized, false);

const syntheticUnaffiliated = JSON.parse(JSON.stringify(template));
syntheticUnaffiliated.status = 'synthetic-ci-fixture';
syntheticUnaffiliated.principalInvestigator.legalName = 'SYNTHETIC TEST NAME';
syntheticUnaffiliated.principalInvestigator.titleOrRole = 'Independent researcher';
syntheticUnaffiliated.principalInvestigator.route = 'unaffiliated-investigator';
syntheticUnaffiliated.contacts.officialResearchContact = 'private-contact-record';
syntheticUnaffiliated.contacts.officialDataRightsContact = 'private-data-rights-record';
syntheticUnaffiliated.funding.declaration = 'no-dedicated-funding';
syntheticUnaffiliated.conflictOfInterest.declaration = 'none-declared';

const ready = guard.validateContext(syntheticUnaffiliated);
assert.strictEqual(ready.valid, true);
assert.strictEqual(ready.status, 'APPLICANT_CONTEXT_READY_FOR_BOARD_VERIFICATION');
assert.deepStrictEqual(ready.missing, []);
assert.strictEqual(ready.boardSelected, false);
assert.strictEqual(ready.externalBoardContactAuthorized, false);
assert.strictEqual(ready.submissionAuthorized, false);
assert.strictEqual(ready.collectionAuthorized, false);

const affiliatedMissingInstitution = JSON.parse(JSON.stringify(syntheticUnaffiliated));
affiliatedMissingInstitution.principalInvestigator.route = 'institution-affiliated';
affiliatedMissingInstitution.principalInvestigator.institutionLegalName = null;
const missingInstitution = guard.validateContext(affiliatedMissingInstitution);
assert.strictEqual(missingInstitution.status, 'APPLICANT_CONTEXT_INCOMPLETE');
assert.ok(missingInstitution.missing.includes('principalInvestigator.institutionLegalName'));

const illegalSelection = JSON.parse(JSON.stringify(syntheticUnaffiliated));
illegalSelection.boardSelection.selectedBoard = 'some-board';
const blocked = guard.validateContext(illegalSelection);
assert.strictEqual(blocked.valid, false);
assert.ok(blocked.errors.includes('selectedBoard must remain null at applicant-context stage'));

assert.strictEqual(template.privacy.publicGitStorageAllowedForCompletedRecord, false);
assert.strictEqual(template.privacy.completedRecordMustRemainPrivate, true);
assert.strictEqual(policy.selectionLock.boardSelectionAuthorized, false);
assert.strictEqual(policy.selectionLock.externalBoardContactAuthorized, false);
assert.strictEqual(policy.selectionLock.submissionToExternalBoardAuthorized, false);
assert.strictEqual(policy.governance.productIqUnlocked, false);

console.log('Calibration v13 Taiwan applicant-context intake validation PASS');
