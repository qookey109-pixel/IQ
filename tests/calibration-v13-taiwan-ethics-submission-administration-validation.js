'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const guard = require('../scripts/check-v13-taiwan-ethics-submission-readiness.js');
const admin = require('../calibration/v13-taiwan-ethics-submission-administration.json');
const intake = require('../calibration/v13-taiwan-ethics-decision-intake.template.json');

const r = guard.evaluateSubmissionReadiness();
assert.strictEqual(r.status, 'NOT_SUBMISSION_READY');
assert.strictEqual(r.authorityPinsOk, true);
assert.ok(r.missing.includes('principalInvestigatorLegalName'));
assert.ok(r.missing.includes('selectedQualifiedIrborRec'));
assert.strictEqual(r.submissionAuthorized, false);
assert.strictEqual(r.collectionAuthorized, false);

const t = guard.validateDecisionIntake(intake);
assert.strictEqual(t.valid, true);
assert.strictEqual(t.resolved, false);
assert.strictEqual(t.collectionAuthorized, false);

const fakeResolvedWithoutEvidence = JSON.parse(JSON.stringify(intake));
fakeResolvedWithoutEvidence.status = 'documented-approved';
const bad = guard.validateDecisionIntake(fakeResolvedWithoutEvidence);
assert.strictEqual(bad.valid, false);
assert.ok(bad.errors.includes('external decision evidence required'));

const fakeResolvedWithEvidence = JSON.parse(JSON.stringify(intake));
fakeResolvedWithEvidence.status = 'documented-approved';
fakeResolvedWithEvidence.reviewBoard = 'EXTERNAL-BOARD-NAME';
fakeResolvedWithEvidence.referenceNumber = 'EXTERNAL-REF';
fakeResolvedWithEvidence.decisionDate = '2026-09-19';
fakeResolvedWithEvidence.externalDecisionEvidence.received = true;
fakeResolvedWithEvidence.externalDecisionEvidence.decisionDocumentSha256 = 'a'.repeat(64);
fakeResolvedWithEvidence.externalDecisionEvidence.decisionDocumentLocalRecordReference = 'NONPUBLIC-RECORD-REF';
const good = guard.validateDecisionIntake(fakeResolvedWithEvidence);
assert.strictEqual(good.valid, true);
assert.strictEqual(good.resolved, true);
assert.strictEqual(good.collectionAuthorized, false);

assert.strictEqual(admin.officialBoardDirectory.selectedBoard, null);
assert.strictEqual(admin.officialBoardDirectory.selectionFrozen, false);
assert.strictEqual(admin.boardRankingAllowed, false);
assert.strictEqual(admin.submissionAdministration.submissionReady, false);
assert.strictEqual(admin.executionLock.submissionToExternalBoardAuthorized, false);
assert.strictEqual(admin.executionLock.realParticipantCollectionAuthorized, false);
assert.strictEqual(admin.governance.productIqUnlocked, false);

console.log('Calibration v13 Taiwan ethics submission administration validation PASS');
