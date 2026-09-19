'use strict';

const assert = require('assert');
const guard = require('../scripts/check-v13-taiwan-board-verification.js');
const matrix = require('../calibration/v13-taiwan-irb-rec-candidate-matrix.json');
const template = require('../calibration/v13-taiwan-board-verification-response.template.json');

assert.strictEqual(matrix.version, 'CIL-V13-TW-IRB-REC-CANDIDATE-MATRIX-2026.09.2');
const byId = Object.fromEntries(matrix.candidates.map(c => [c.id, c]));

assert.strictEqual(byId['tmu-jirb-c'].availability.status, 'external-new-intake-paused-for-2026');
assert.strictEqual(byId['tmu-jirb-c'].availability.availableForNewExternalSubmission, false);
assert.strictEqual(byId['tmu-jirb-c'].selected, false);

for (const c of matrix.candidates) {
  assert.strictEqual(c.selected, false);
  assert.strictEqual(c.externalRouteEvidence.unaffiliatedIndividualAcceptanceVerified, false);
}
assert.strictEqual(matrix.selectionPolicy.rankingAllowed, false);
assert.strictEqual(matrix.selectionPolicy.automaticSelectionAllowed, false);
assert.strictEqual(matrix.selectionPolicy.selectedBoard, null);
assert.strictEqual(matrix.selectionPolicy.verificationInquiryRequiredBeforeSelection, true);

const blank = guard.validate(template);
assert.strictEqual(blank.valid, true);
assert.strictEqual(blank.boardSelectable, false);
assert.strictEqual(blank.contactAuthorized, false);
assert.strictEqual(blank.submissionAuthorized, false);
assert.strictEqual(blank.collectionAuthorized, false);

const unsupported = JSON.parse(JSON.stringify(template));
unsupported.status = 'verification-record';
unsupported.boardId = 'not-a-real-candidate';
assert.strictEqual(guard.validate(unsupported).valid, false);

const positiveWithoutEvidence = JSON.parse(JSON.stringify(template));
positiveWithoutEvidence.status = 'verification-record';
positiveWithoutEvidence.boardId = 'landseed-irb';
positiveWithoutEvidence.availability.acceptingNewExternalSubmissions = true;
const bad = guard.validate(positiveWithoutEvidence);
assert.strictEqual(bad.valid, false);
assert.ok(bad.errors.includes('positive verification requires official URL or private board reply record'));

const positiveWithEvidence = JSON.parse(JSON.stringify(positiveWithoutEvidence));
positiveWithEvidence.evidence.publicOfficialUrls = ['https://example.invalid/official-placeholder'];
const good = guard.validate(positiveWithEvidence);
assert.strictEqual(good.valid, true);
assert.strictEqual(good.boardSelectable, false);
assert.strictEqual(good.submissionAuthorized, false);

assert.strictEqual(matrix.executionLock.externalBoardContactAuthorized, false);
assert.strictEqual(matrix.executionLock.submissionToExternalBoardAuthorized, false);
assert.strictEqual(matrix.executionLock.realParticipantCollectionAuthorized, false);
assert.strictEqual(matrix.governance.productIqUnlocked, false);

console.log('Calibration v13 Taiwan board-verification inquiry validation PASS');
