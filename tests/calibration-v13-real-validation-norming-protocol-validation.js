'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const protocol = require('../calibration/v13-real-validation-norming-protocol.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(protocol.version, 'CIL-V13-REAL-VALIDATION-NORMING-PROTOCOL-2026.09.1');
assert.strictEqual(protocol.status, 'prospective-protocol-target-population-amendment-required-before-data');
assert.strictEqual(protocol.authority.basisMainSha, 'f00849fc823676d4758332f9854c9e2f1b9a60bd');

assert.strictEqual(
  protocol.authority.v12ConfirmatoryResultBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v12-confirmatory-result.json'))
);
assert.strictEqual(
  protocol.authority.psychometricReadinessPolicyBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'psychometric-readiness-policy.json'))
);
assert.strictEqual(
  protocol.authority.pooledStudyPolicyBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'pooled-study-policy.json'))
);
assert.strictEqual(
  protocol.authority.externalValidationSchemaBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'external-validation-schema.json'))
);

assert.strictEqual(protocol.historicalBoundary.v12ConfirmatoryStatus, 'confirmatory-pass');
assert.strictEqual(protocol.historicalBoundary.v11Verdict, 'failed-confirmatory');
assert.strictEqual(protocol.historicalBoundary.mayReinterpretV11, false);

assert.strictEqual(protocol.targetPopulation.ageYears.minimum, 18);
assert.strictEqual(protocol.targetPopulation.ageYears.maximum, 65);
assert.strictEqual(protocol.targetPopulation.jurisdiction, null);
assert.strictEqual(protocol.targetPopulation.languageVersion, null);
assert.strictEqual(protocol.targetPopulation.requiredBeforeAnyRealParticipantCollection, true);

assert.strictEqual(protocol.phaseARealValidation.minimumIndependentParticipants, 2500);
assert.strictEqual(protocol.phaseARealValidation.minimumPerAgeBand, 250);
assert.strictEqual(protocol.phaseARealValidation.minimumMatrixSlotsObserved, 48);
assert.strictEqual(protocol.phaseARealValidation.minimumAnchorCompletionRate, 0.70);
assert.strictEqual(protocol.phaseARealValidation.minimumAverageFormalItemExposure, 40);
assert.strictEqual(protocol.phaseARealValidation.normEligible, false);

assert.strictEqual(protocol.phaseARealValidation.dif.selectedMethod, 'domain-loo-eap-fixed-theta');
assert.strictEqual(protocol.phaseARealValidation.dif.alpha, 0.01);
assert.strictEqual(protocol.phaseARealValidation.dif.maximumMaterialFlagRateScreen, 0.10);
assert.strictEqual(protocol.phaseARealValidation.dif.finalCandidateRequiresZeroUnresolvedMaterialFlags, true);
assert.strictEqual(protocol.phaseARealValidation.dif.knownTruthSensitivityAvailableInRealData, false);

assert.strictEqual(protocol.phaseBNorming.minimumIndependentParticipants, 5000);
assert.strictEqual(protocol.phaseBNorming.minimumPerAgeBand, 500);
assert.strictEqual(protocol.phaseBNorming.minimumMatrixSlotsObserved, 56);
assert.strictEqual(protocol.phaseBNorming.minimumAnchorCompletionRate, 0.80);
assert.strictEqual(protocol.phaseBNorming.minimumAverageFormalItemExposure, 80);
assert.strictEqual(protocol.phaseBNorming.mustUseNewIndependentParticipantsNotInPhaseA, true);
assert.strictEqual(protocol.phaseBNorming.representativeSampling.ageBandMinimumsAloneDoNotEstablishRepresentativeness, true);
assert.strictEqual(protocol.phaseBNorming.uncertainty.stratifiedBootstrapReplicates, 2000);
assert.strictEqual(protocol.phaseBNorming.uncertainty.confidenceLevel, 0.95);

assert.strictEqual(protocol.phaseARealValidation.externalLinking.minimumLinkedParticipantsForPrimaryEvidence, 100);
assert.strictEqual(protocol.phaseARealValidation.externalLinking.plannedTargetLinkedParticipants, 500);
assert.strictEqual(protocol.phaseARealValidation.externalLinking.plannedTargetIsValidityThreshold, false);

for (const key of ['autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked']) {
  assert.strictEqual(protocol.analysisAndReporting[key], false, key + ' must remain false');
}
assert.strictEqual(protocol.unlockBoundary.numericScreensAloneMayUnlockIq, false);
assert.strictEqual(protocol.unlockBoundary.requiresSeparateExplicitProductUnlockDecision, true);

for (const key of [
  'realParticipantCollectionAuthorized',
  'participantDataAccessAuthorized',
  'externalInstrumentAdministrationAuthorized',
  'phaseAAnalysisAuthorized',
  'phaseBCollectionAuthorized',
  'phaseBNormEstimationAuthorized',
  'backendCollectionAuthorized'
]) {
  assert.strictEqual(protocol.executionLock[key], false, key + ' must remain false');
}
assert.strictEqual(protocol.executionLock.executionWorkflowIncludedInThisProtocol, false);
assert.strictEqual(protocol.executionLock.separatePreCollectionTargetPopulationAmendmentRequired, true);
assert.strictEqual(protocol.executionLock.separateExecutionAuthorizationRequired, true);

console.log('Calibration v13 real validation/norming protocol validation PASS');
