'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const a = require('../calibration/v13-taiwan-schema-privacy-amendment.json');
const proposed = require('../calibration/pooled-study-schema-v2-tw.proposed.json');
const active = require('../calibration/pooled-study-schema.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(a.version, 'CIL-V13-TW-SCHEMA-PRIVACY-AMENDMENT-2026.09.1');
assert.strictEqual(a.status, 'schema-privacy-defined-collection-still-locked');
assert.strictEqual(a.authority.basisMainSha, '984b803228a010cac44f03498aff1c8d70912010');
assert.strictEqual(
  a.authority.targetPopulationAmendmentBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-target-population-amendment.json'))
);
assert.strictEqual(
  a.authority.activeResponseRowSchemaBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'schema.json'))
);
assert.strictEqual(
  a.authority.activePooledExportSchemaBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'pooled-study-schema.json'))
);

assert.strictEqual(a.minimumResearchMetadata.storageLevel, 'session');
assert.deepStrictEqual(
  Object.keys(a.minimumResearchMetadata.fields).sort(),
  ['householdRegistrationEligibility','macroRegion','sexForWeighting'].sort()
);
assert.deepStrictEqual(
  a.minimumResearchMetadata.fields.sexForWeighting.allowedValues,
  ['male','female','not-stated']
);
assert.deepStrictEqual(
  a.minimumResearchMetadata.fields.macroRegion.allowedValues,
  ['north','central','south','east','offshore','not-stated']
);
assert.strictEqual(a.minimumResearchMetadata.fields.sexForWeighting.mayBeInferred, false);
assert.strictEqual(a.minimumResearchMetadata.fields.macroRegion.mayBeInferredFromIp, false);

assert.strictEqual(a.normingWeightEligibility.notStatedResponsesMayRemainInPsychometricValidationCohort, true);
assert.strictEqual(a.normingWeightEligibility.notStatedResponsesExcludedFromPrimaryRakedNormingCohort, true);
assert.strictEqual(a.normingWeightEligibility.missingOrNotStatedValuesMayNotBeImputedFromOtherPersonalSignals, true);

for (const key of [
  'directIdentifiersAllowed','nameAllowed','emailAllowed','accountIdAllowed','ipAddressAllowed',
  'dateOfBirthAllowed','preciseLocationAllowed','rawCountyOrCityStorageAllowed','streetAddressAllowed',
  'phoneAllowed','automaticUploadAllowed','participantLevelPublicArtifactAllowed','participantLevelGitCommitAllowed'
]) {
  assert.strictEqual(a.privacy[key], false, key + ' must remain false');
}
assert.strictEqual(a.privacy.macroRegionAllowed, true);
assert.strictEqual(a.privacy.sexForWeightingAllowed, true);
assert.strictEqual(a.privacy.householdRegistrationEligibilityAllowed, true);
assert.strictEqual(a.privacy.manualOfflineExportRemainsAuthority, true);

assert.strictEqual(a.retentionAndUse.retentionDuration, null);
assert.strictEqual(a.retentionAndUse.retentionDurationMustBeFrozenBeforeCollection, true);
assert.strictEqual(a.retentionAndUse.deletionProcedureMustBeDocumentedBeforeCollection, true);

assert.strictEqual(active.$id, 'https://cognitive-iq-lab.local/calibration/pooled-study-export-v1.json');
assert.strictEqual(active.properties.schemaVersion.const, 1);
assert.strictEqual(proposed.properties.schemaVersion.const, 2);
assert.strictEqual(proposed.title.includes('NOT ACTIVE'), true);
const s = proposed.properties.sessions.items.properties;
assert.strictEqual(s.householdRegistrationEligibility.type, 'boolean');
assert.deepStrictEqual(s.sexForWeighting.enum, ['male','female','not-stated']);
assert.deepStrictEqual(s.macroRegion.enum, ['north','central','south','east','offshore','not-stated']);

assert.strictEqual(a.schemaActivation.activePooledExportSchemaRemainsVersion, 1);
assert.strictEqual(a.schemaActivation.activeProductionExporterChanged, false);
assert.strictEqual(a.schemaActivation.activePoolingRuntimeChanged, false);
assert.strictEqual(a.schemaActivation.collectionFormChanged, false);
assert.strictEqual(a.schemaActivation.schemaActivationAuthorized, false);

for (const key of [
  'realParticipantCollectionAuthorized','participantDataAccessAuthorized',
  'externalInstrumentAdministrationAuthorized','phaseAAnalysisAuthorized',
  'phaseBCollectionAuthorized','phaseBNormEstimationAuthorized',
  'backendCollectionAuthorized','productionExporterModificationAuthorized'
]) {
  assert.strictEqual(a.executionLock[key], false, key + ' must remain false');
}
assert.strictEqual(a.executionLock.executionWorkflowIncluded, false);
assert.strictEqual(a.executionLock.separateRecruitmentExecutionPlanRequired, true);
assert.strictEqual(a.executionLock.separateCollectionAuthorizationRequired, true);

for (const key of ['autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked','populationNormClaimAllowedNow']) {
  assert.strictEqual(a.governance[key], false, key + ' must remain false');
}

console.log('Calibration v13 Taiwan schema/privacy amendment validation PASS');
