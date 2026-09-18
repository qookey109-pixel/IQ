'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const p = require('../calibration/v13-target-population-amendment.proposed.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(p.version, 'CIL-V13-TARGET-POPULATION-AMENDMENT-PREP-2026.09.1');
assert.strictEqual(p.status, 'prepared-incomplete-target-population-not-frozen');
assert.strictEqual(p.authority.basisMainSha, '3785342405cfd516323cdba6e7142a51e3dfce81');

assert.strictEqual(
  p.authority.v13ProtocolBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-real-validation-norming-protocol.json'))
);
assert.strictEqual(
  p.authority.psychometricReadinessPolicyBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'psychometric-readiness-policy.json'))
);
assert.strictEqual(
  p.authority.pooledStudyPolicyBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'pooled-study-policy.json'))
);
assert.strictEqual(
  p.authority.responseSchemaBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'schema.json'))
);

for (const key of [
  'jurisdiction',
  'populationDefinition',
  'productionLanguageVersion',
  'inclusionResidencyRule',
  'samplingFrameReference',
  'samplingFrameVersion',
  'populationBenchmarkSource',
  'populationBenchmarkVersion',
  'benchmarkReferenceDate'
]) {
  assert.strictEqual(p.targetPopulation[key], null, key + ' must remain unresolved in preparation');
}
assert.strictEqual(p.targetPopulation.complete, false);

assert.deepStrictEqual(p.benchmarkPlan.minimumRequiredDimensions, ['ageBand']);
assert.strictEqual(p.benchmarkPlan.additionalDimensionsAuthorized, false);
assert.strictEqual(p.benchmarkPlan.schemaAndPrivacyAmendmentRequiredBeforeAddingDemographics, true);
assert.strictEqual(p.weightingPlan.method, null);
assert.strictEqual(p.weightingPlan.methodFrozen, false);
assert.strictEqual(p.weightingPlan.postCollectionMethodSelectionAllowed, false);

assert.strictEqual(p.samplingPlan.totalIndependentParticipantFloor, 5000);
assert.strictEqual(p.samplingPlan.ageBandQuotaFloor, 500);
assert.strictEqual(p.samplingPlan.matrixSlotsRequired, 56);
assert.strictEqual(p.samplingPlan.minimumAnchorCompletionRate, 0.80);
assert.strictEqual(p.samplingPlan.minimumAverageFormalItemExposure, 80);
assert.strictEqual(p.samplingPlan.convenienceSampleMayBeCalledRepresentative, false);
assert.strictEqual(p.samplingPlan.quotaCompletionAloneMayBeCalledRepresentative, false);

assert.strictEqual(p.privacyAndEthics.additionalDemographicsCollectionAuthorized, false);
assert.strictEqual(p.privacyAndEthics.automaticUploadAllowed, false);
assert.strictEqual(p.privacyAndEthics.backendCollectionAuthorized, false);

for (const value of Object.values(p.readinessToFreeze)) {
  assert.strictEqual(value, false, 'All readiness-to-freeze flags must remain false');
}

for (const key of [
  'realParticipantCollectionAuthorized',
  'participantDataAccessAuthorized',
  'externalInstrumentAdministrationAuthorized',
  'phaseAAnalysisAuthorized',
  'phaseBCollectionAuthorized',
  'phaseBNormEstimationAuthorized',
  'backendCollectionAuthorized'
]) {
  assert.strictEqual(p.executionLock[key], false, key + ' must remain false');
}
assert.strictEqual(p.executionLock.executionWorkflowIncluded, false);
assert.strictEqual(p.executionLock.separateCompletedAmendmentRequired, true);
assert.strictEqual(p.executionLock.separateCollectionAuthorizationRequired, true);

for (const key of ['autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked','numericQuotaCompletionMayUnlockIq']) {
  assert.strictEqual(p.governance[key], false, key + ' must remain false');
}

console.log('Calibration v13 target-population amendment preparation validation PASS');
