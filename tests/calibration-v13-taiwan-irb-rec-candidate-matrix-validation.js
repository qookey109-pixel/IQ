'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const m = require('../calibration/v13-taiwan-irb-rec-candidate-matrix.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(m.version, 'CIL-V13-TW-IRB-REC-CANDIDATE-MATRIX-2026.09.1');
assert.strictEqual(m.status, 'candidate-discovery-complete-selection-not-frozen');
assert.strictEqual(m.authority.basisMainSha, 'bfa42b8434dc8c66f6475f615b31959d469bc75c');
assert.strictEqual(
  m.authority.submissionAdministrationBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-taiwan-ethics-submission-administration.json'))
);

assert.strictEqual(m.candidates.length, 5);
for (const c of m.candidates) {
  assert.strictEqual(c.selected, false);
  assert.strictEqual(c.externalRouteEvidence.unaffiliatedIndividualAcceptanceVerified, false);
  assert.strictEqual(c.onlineBehavioralPsychometricScopeVerified, false);
  assert.strictEqual(c.fees.currentProjectSpecificFeeVerified, false);
  assert.ok(Array.isArray(c.followUpRequired) && c.followUpRequired.length > 0);
}

const byId = Object.fromEntries(m.candidates.map(c => [c.id, c]));
for (const id of ['tmu-jirb-c','new-taipei-city-hospital-irb','landseed-irb','vghtc-irb2','ptvgh-irb']) {
  assert.ok(byId[id], id + ' missing');
}
assert.strictEqual(byId['ptvgh-irb'].qualifiedValidity.shorterValidityWarning, true);
assert.strictEqual(byId['ptvgh-irb'].qualifiedValidity.through, '2026-12-31');
assert.strictEqual(byId['landseed-irb'].externalRouteEvidence.status, 'external-research-route-documented');
assert.strictEqual(byId['ptvgh-irb'].externalRouteEvidence.status, 'external-delegated-review-route-documented');

assert.strictEqual(m.selectionPolicy.rankingAllowed, false);
assert.strictEqual(m.selectionPolicy.automaticSelectionAllowed, false);
assert.strictEqual(m.selectionPolicy.selectedBoard, null);
assert.strictEqual(m.selectionPolicy.selectionRequiresApplicantContext, true);

for (const key of [
  'boardSelectionAuthorized',
  'externalBoardContactAuthorized',
  'submissionToExternalBoardAuthorized',
  'realParticipantCollectionAuthorized',
  'recruitmentLaunchAuthorized',
  'participantDataAccessAuthorized',
  'schemaActivationAuthorized'
]) {
  assert.strictEqual(m.executionLock[key], false, key + ' must remain false');
}

for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq']) {
  assert.strictEqual(m.governance[key], false, key + ' must remain false');
}

console.log('Calibration v13 Taiwan IRB/REC candidate matrix validation PASS');
