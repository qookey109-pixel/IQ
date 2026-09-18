'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const p = require('../calibration/v13-taiwan-ethics-applicability-packet.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(p.version, 'CIL-V13-TW-ETHICS-APPLICABILITY-PACKET-2026.09.1');
assert.strictEqual(p.status, 'prepared-for-formal-determination-ethics-unresolved-collection-locked');
assert.strictEqual(p.authority.basisMainSha, '2f351680e306de9f784536a6abb70be0d78e4894');

assert.strictEqual(
  p.authority.targetPopulationAmendmentBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-target-population-amendment.json'))
);
assert.strictEqual(
  p.authority.schemaPrivacyAmendmentBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-taiwan-schema-privacy-amendment.json'))
);
assert.strictEqual(
  p.authority.recruitmentConsentPlanBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-taiwan-recruitment-consent-plan.json'))
);
assert.strictEqual(
  p.authority.activationReadinessPolicyBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-taiwan-activation-readiness-policy.json'))
);
assert.strictEqual(
  p.authority.consentDraftBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'V13_TAIWAN_PARTICIPANT_CONSENT_ZH_HANT_TW.md'))
);

assert.strictEqual(p.workingClassification.presumptiveHumanSubjectsResearch, true);
assert.strictEqual(p.workingClassification.selfDeclaredExempt, false);
assert.strictEqual(p.workingClassification.selfDeclaredExpedited, false);
assert.strictEqual(p.workingClassification.requestedDetermination, 'IRB/REC to determine review applicability and review category');

assert.strictEqual(p.studySummary.physicalIntervention, false);
assert.strictEqual(p.studySummary.medicalTreatment, false);
assert.strictEqual(p.studySummary.clinicalDiagnosis, false);
assert.strictEqual(p.studySummary.phaseAPlanningFloor.minimumIndependentParticipants, 2500);
assert.strictEqual(p.studySummary.phaseBPlanningFloor.minimumIndependentParticipants, 5000);
assert.strictEqual(p.studySummary.phaseBPlanningFloor.mustUseNewIndependentParticipants, true);

assert.strictEqual(p.dataAndPrivacy.directIdentifiersCollected, false);
assert.strictEqual(p.dataAndPrivacy.automaticUpload, false);
assert.strictEqual(p.dataAndPrivacy.publicParticipantLevelArtifact, false);
assert.strictEqual(p.dataAndPrivacy.gitParticipantLevelData, false);
assert.strictEqual(p.dataAndPrivacy.participantLevelRetentionYearsAfterFormalStudyClosure, 5);

assert.strictEqual(p.recruitmentAndConsent.compensationAuthorized, false);
assert.strictEqual(p.recruitmentAndConsent.consentVersion, 'CIL-V13-TW-CONSENT-2026.09.1');
assert.strictEqual(p.recruitmentAndConsent.affirmativeConsentBeforeResearchData, true);

assert.strictEqual(p.submissionAdministration.submissionReady, false);
assert.strictEqual(p.submissionAdministration.mustNotBeGuessedFromChatOrAccountContext, true);
assert.ok(p.submissionAdministration.unresolvedRequiredFields.includes('principalInvestigatorLegalName'));
assert.ok(p.submissionAdministration.unresolvedRequiredFields.includes('selectedQualifiedIrborRec'));

assert.strictEqual(p.determination.status, 'unset');
assert.strictEqual(p.determination.reviewCategory, null);
assert.strictEqual(p.determination.referenceNumber, null);
assert.strictEqual(p.determination.mayNotBeEditedToApprovedWithoutExternalDocumentedDetermination, true);

for (const key of [
  'realParticipantCollectionAuthorized',
  'participantDataAccessAuthorized',
  'externalInstrumentAdministrationAuthorized',
  'phaseAAnalysisAuthorized',
  'phaseBCollectionAuthorized',
  'phaseBNormEstimationAuthorized',
  'backendCollectionAuthorized',
  'recruitmentLaunchAuthorized',
  'consentPageActivationAuthorized',
  'schemaActivationAuthorized'
]) {
  assert.strictEqual(p.executionLock[key], false, key + ' must remain false');
}
assert.strictEqual(p.executionLock.executionWorkflowIncluded, false);
assert.strictEqual(p.executionLock.separateCollectionAuthorizationRequired, true);

for (const key of ['autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked','populationNormClaimAllowedNow']) {
  assert.strictEqual(p.governance[key], false, key + ' must remain false');
}

console.log('Calibration v13 Taiwan ethics applicability packet validation PASS');
