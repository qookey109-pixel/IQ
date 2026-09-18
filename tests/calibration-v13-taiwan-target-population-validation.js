'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const a = require('../calibration/v13-target-population-amendment.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(a.version, 'CIL-V13-TW-TARGET-POPULATION-AMENDMENT-2026.09.1');
assert.strictEqual(a.status, 'target-population-frozen-collection-still-locked');
assert.strictEqual(a.authority.basisMainSha, '6ed8d096fd78ad8d5badee58acec4f78240d822d');
assert.strictEqual(
  a.authority.v13ProtocolBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-real-validation-norming-protocol.json'))
);
assert.strictEqual(
  a.authority.targetPopulationPrepBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v13-target-population-amendment.proposed.json'))
);
assert.strictEqual(
  a.authority.responseSchemaBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'schema.json'))
);

assert.strictEqual(a.targetPopulation.jurisdiction, 'Taiwan');
assert.strictEqual(a.targetPopulation.productionLanguageVersion, 'zh-Hant-TW');
assert.strictEqual(a.targetPopulation.ageYears.minimum, 18);
assert.strictEqual(a.targetPopulation.ageYears.maximum, 65);
assert.strictEqual(a.targetPopulation.registeredPopulationRequired, true);
assert.strictEqual(a.targetPopulation.complete, true);

assert.strictEqual(a.populationBenchmark.primarySourceAgency, 'Department of Household Registration, Ministry of the Interior, Taiwan');
assert.strictEqual(a.populationBenchmark.officialTableCode, '10122-00-02');
assert.strictEqual(a.populationBenchmark.referenceDate, '2026-08-31');
assert.strictEqual(a.populationBenchmark.latestReleaseUsed, '2026-09-10');
assert.strictEqual(a.populationBenchmark.benchmarkVersion, 'MOI-HR-2026-08-31');

assert.deepStrictEqual(a.benchmarkDimensions.primaryMargins, ['ageBand','sexForWeighting','macroRegion']);
assert.deepStrictEqual(a.benchmarkDimensions.ageBands, ['18–24','25–34','35–44','45–54','55–65']);
assert.strictEqual(Object.keys(a.benchmarkDimensions.macroRegionMapping).length, 5);
assert.strictEqual(a.benchmarkDimensions.additionalDimensionsAuthorizedInThisAmendment, false);
assert.strictEqual(a.benchmarkDimensions.schemaPrivacyAmendmentRequiredBeforeCollection, true);

assert.strictEqual(a.samplingFrame.design, 'nonprobability-multisource-online-recruitment-with-prospective-quota-monitoring-and-calibration-weighting');
assert.strictEqual(a.samplingFrame.probabilitySamplingClaimAllowed, false);
assert.strictEqual(a.samplingFrame.minimumIndependentRecruitmentChannelClasses, 3);
assert.strictEqual(a.samplingFrame.singleChannelMaximumShareOfUnweightedIndependentCohort, 0.60);
assert.strictEqual(a.samplingFrame.quotaCompletionAloneEstablishesRepresentativeness, false);

assert.strictEqual(a.weightingPlan.method, 'iterative-proportional-fitting-raking');
assert.deepStrictEqual(a.weightingPlan.benchmarkMargins, ['ageBand','sexForWeighting','macroRegion']);
assert.strictEqual(a.weightingPlan.maximumIterations, 100);
assert.strictEqual(a.weightingPlan.convergenceRule.threshold, 0.005);
assert.strictEqual(a.weightingPlan.weightBounds.minimum, 0.33);
assert.strictEqual(a.weightingPlan.weightBounds.maximum, 3.0);
assert.strictEqual(a.weightingPlan.postCollectionMethodSelectionAllowed, false);
assert.strictEqual(a.weightingPlan.methodFrozen, true);
assert.strictEqual(a.weightingPlan.effectiveSampleSize.automaticPassThreshold, null);

assert.strictEqual(a.phaseBFloors.minimumIndependentParticipants, 5000);
assert.strictEqual(a.phaseBFloors.minimumPerAgeBand, 500);
assert.strictEqual(a.phaseBFloors.minimumMatrixSlotsObserved, 56);
assert.strictEqual(a.phaseBFloors.minimumAnchorCompletionRate, 0.80);
assert.strictEqual(a.phaseBFloors.minimumAverageFormalItemExposure, 80);

assert.strictEqual(a.privacyAndSchemaBoundary.currentResponseSchemaHasRequiredWeightingFields, false);
assert.deepStrictEqual(
  a.privacyAndSchemaBoundary.fieldsStillNeededBeforeCollection,
  ['householdRegistrationEligibility','sexForWeighting','macroRegion']
);
assert.strictEqual(a.privacyAndSchemaBoundary.separateSchemaPrivacyAmendmentRequired, true);

for (const key of [
  'realParticipantCollectionAuthorized',
  'participantDataAccessAuthorized',
  'externalInstrumentAdministrationAuthorized',
  'phaseAAnalysisAuthorized',
  'phaseBCollectionAuthorized',
  'phaseBNormEstimationAuthorized',
  'backendCollectionAuthorized'
]) {
  assert.strictEqual(a.executionLock[key], false, key + ' must remain false');
}
assert.strictEqual(a.executionLock.executionWorkflowIncluded, false);
assert.strictEqual(a.executionLock.separateSchemaPrivacyAmendmentRequired, true);
assert.strictEqual(a.executionLock.separateRecruitmentExecutionPlanRequired, true);
assert.strictEqual(a.executionLock.separateCollectionAuthorizationRequired, true);

for (const key of ['autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked','populationNormClaimAllowedNow']) {
  assert.strictEqual(a.governance[key], false, key + ' must remain false');
}

console.log('Calibration v13 Taiwan target-population amendment validation PASS');
