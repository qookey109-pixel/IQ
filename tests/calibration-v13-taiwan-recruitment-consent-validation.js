'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const p = require('../calibration/v13-taiwan-recruitment-consent-plan.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(p.version, 'CIL-V13-TW-RECRUITMENT-CONSENT-PLAN-2026.09.1');
assert.strictEqual(p.status, 'recruitment-consent-plan-frozen-collection-still-locked');
assert.strictEqual(p.authority.basisMainSha, 'd42f705edc7f3782e1fac5c11ff9273d550c3a03');
assert.strictEqual(
  p.authority.targetPopulationAmendmentBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-target-population-amendment.json'))
);
assert.strictEqual(
  p.authority.schemaPrivacyAmendmentBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-taiwan-schema-privacy-amendment.json'))
);
assert.strictEqual(
  p.authority.proposedTaiwanSchemaBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'pooled-study-schema-v2-tw.proposed.json'))
);

assert.strictEqual(p.ethicsGate.humanResearchApplicabilityDeterminationRequiredBeforeCollection, true);
assert.strictEqual(p.ethicsGate.collectionMayNotBeginWhileDeterminationStatusIsUnset, true);
assert.strictEqual(p.ethicsGate.determinationStatus, 'unset');
assert.strictEqual(p.ethicsGate.thisPlanIsNotAnEthicsApproval, true);

assert.strictEqual(p.recruitment.minimumActiveChannelClasses, 3);
assert.strictEqual(p.recruitment.singleChannelMaximumShareOfUnweightedIndependentCohort, 0.60);
assert.strictEqual(p.recruitment.probabilitySamplingClaimAllowed, false);
assert.strictEqual(p.recruitment.compensationAuthorized, false);
assert.strictEqual(p.recruitment.recruitmentCopyMayPromiseIqScore, false);

assert.strictEqual(p.antiDuplication.primaryIndependenceUnit, 'sourceKey');
assert.strictEqual(p.antiDuplication.ipAddressDeduplicationAllowed, false);
assert.strictEqual(p.antiDuplication.deviceFingerprintingAllowed, false);
assert.strictEqual(p.antiDuplication.accountIdentityDeduplicationAllowed, false);
assert.strictEqual(p.antiDuplication.emailDeduplicationAllowed, false);
assert.strictEqual(p.antiDuplication.rawRecruitmentTokenStoredInPsychometricDataset, false);
assert.strictEqual(p.antiDuplication.tokenHashRetentionDaysAfterRedemption, 30);

assert.strictEqual(p.consent.language, 'zh-Hant-TW');
assert.strictEqual(p.consent.version, 'CIL-V13-TW-CONSENT-2026.09.1');
assert.strictEqual(p.consent.affirmativeConsentRequired, true);
assert.strictEqual(p.consent.consentBeforeAnyResearchMetadataOrResponses, true);
assert.strictEqual(fs.existsSync(path.join(root, 'calibration', 'V13_TAIWAN_PARTICIPANT_CONSENT_ZH_HANT_TW.md')), true);

assert.strictEqual(p.retentionAndDeletion.participantLevelRetentionYearsAfterStudyClosure, 5);
assert.strictEqual(p.retentionAndDeletion.rawRecruitmentTokenHashRetentionDaysAfterRedemption, 30);
assert.strictEqual(p.retentionAndDeletion.deletionRequestMustNotRequireNameEmailAccountOrGovernmentId, true);
assert.strictEqual(p.retentionAndDeletion.deletionSlaCalendarDays, 30);
assert.strictEqual(p.retentionAndDeletion.retentionChangeAfterCollectionAllowedWithoutAmendment, false);

for (const value of Object.values(p.collectionStopRules)) {
  assert.strictEqual(value, true);
}

assert.strictEqual(p.schemaActivationBoundary.proposedSchemaVersion, 2);
assert.strictEqual(p.schemaActivationBoundary.activeSchemaVersionAtPlanFreeze, 1);
assert.strictEqual(p.schemaActivationBoundary.schemaActivationAuthorized, false);
assert.strictEqual(p.schemaActivationBoundary.productionExporterModificationAuthorized, false);
assert.strictEqual(p.schemaActivationBoundary.poolingRuntimeModificationAuthorized, false);

for (const key of [
  'realParticipantCollectionAuthorized','participantDataAccessAuthorized',
  'externalInstrumentAdministrationAuthorized','phaseAAnalysisAuthorized',
  'phaseBCollectionAuthorized','phaseBNormEstimationAuthorized','backendCollectionAuthorized',
  'recruitmentLaunchAuthorized','consentPageActivationAuthorized'
]) {
  assert.strictEqual(p.executionLock[key], false, key + ' must remain false');
}
assert.strictEqual(p.executionLock.executionWorkflowIncluded, false);
assert.strictEqual(p.executionLock.separateCollectionAuthorizationRequired, true);

for (const key of ['autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked','populationNormClaimAllowedNow']) {
  assert.strictEqual(p.governance[key], false, key + ' must remain false');
}

console.log('Calibration v13 Taiwan recruitment/consent plan validation PASS');
