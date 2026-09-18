'use strict';

const assert = require('assert');
const fs = require('fs');

const protocolPath = 'calibration/v12-dif-matching-protocol.json';
const protocol = JSON.parse(fs.readFileSync(protocolPath, 'utf8'));

(function validateAuthorityAndHistory() {
  assert.strictEqual(protocol.version, 'CIL-V12-DIF-MATCHING-2026.09.2');
  assert.strictEqual(protocol.status, 'prospective-method-selection-protocol-pre-execution-amended');
  assert.strictEqual(protocol.authority.basisMainSha, 'c830e48c2170d0bab5341506487f36c6ae7f88d2');
  assert.strictEqual(protocol.authority.frozenV11ConfirmatoryHead, '586f22d4b2ec405ae5ffd68def0f00f5b3423c73');
  assert.strictEqual(protocol.authority.v11PostFailureDiagnosticHead, '70d3f9af15c57cb4e33447d050f21e2bdf1320ef');
  assert.strictEqual(protocol.historicalBoundary.v11Verdict, 'failed-confirmatory');
  assert.strictEqual(protocol.historicalBoundary.mayReinterpretV11, false);
  assert.strictEqual(protocol.historicalBoundary.mayChangeV11Seeds, false);
  assert.strictEqual(protocol.historicalBoundary.mayChangeV11Thresholds, false);
  assert.strictEqual(protocol.preExecutionAmendment.analysesExecutedBeforeAmendment, false);
  assert.strictEqual(protocol.preExecutionAmendment.resultsInspectedBeforeAmendment, false);
  assert.strictEqual(protocol.preExecutionAmendment.thresholdsChanged, false);
  assert.strictEqual(protocol.preExecutionAmendment.seedFamiliesChanged, false);
  assert.strictEqual(protocol.preExecutionAmendment.governanceLocksChanged, false);
})();

(function validateFrozenDifSettings() {
  assert.strictEqual(protocol.fixedDifSettings.criterion, 'Chisqr');
  assert.strictEqual(protocol.fixedDifSettings.alpha, 0.01);
  assert.strictEqual(protocol.fixedDifSettings.pseudoR2, 'McFadden');
  assert.strictEqual(protocol.fixedDifSettings.referenceMaterialDeltaR2, 0.02);
  assert.strictEqual(protocol.fixedDifSettings.maximumCleanPanelDifFlagRate, 0.10);
})();

(function validateDevelopmentDesign() {
  assert.strictEqual(protocol.development.replicatesPerPanel, 5);
  assert.strictEqual(protocol.development.participantsPerReplicate, 1200);
  assert.strictEqual(protocol.development.cleanPanel.totalTargetItems, 42);
  assert.strictEqual(protocol.development.cleanPanel.itemDiscriminationMultiplier, 2.0);
  assert.strictEqual(protocol.development.cleanPanel.implantedAgeDif, false);
  assert.strictEqual(protocol.development.implantedDifPanel.totalTargetItems, 42);
  assert.strictEqual(protocol.development.implantedDifPanel.implantedAgeDifPerDomain, 1);
  assert.strictEqual(protocol.development.implantedDifPanel.implantedAgeDifEffect, 0.70);
  assert.notStrictEqual(
    protocol.development.cleanPanel.seedPrefix,
    protocol.development.implantedDifPanel.seedPrefix
  );
})();

(function validateMatchingCandidates() {
  const methods = protocol.matchingMethods;
  assert.strictEqual(methods.length, 3);

  const baseline = methods.find(x => x.id === 'lordif-iterative-current');
  const loo = methods.find(x => x.id === 'domain-loo-eap-fixed-theta');
  const crossfit = methods.find(x => x.id === 'crossfit-six-factor-map-fixed-theta');

  assert.ok(baseline && loo && crossfit);
  assert.strictEqual(baseline.selectable, false);
  assert.strictEqual(baseline.targetIndependent, false);
  assert.strictEqual(baseline.purificationFeedback, true);

  assert.strictEqual(loo.matchingModel, 'unidimensional-2PL-EAP-within-target-domain');
  assert.strictEqual(crossfit.matchingModel, 'correlated-six-factor-2PL-MAP');
  assert.strictEqual(crossfit.scoreEstimator, 'MAP');

  for (const candidate of [loo, crossfit]) {
    assert.strictEqual(candidate.selectable, true);
    assert.strictEqual(candidate.targetIndependent, true);
    assert.strictEqual(candidate.purificationFeedback, false);
    assert.match(candidate.difExecution, /fixed theta/i);
  }
})();

(function validateSelectionAndConfirmatoryLocks() {
  assert.strictEqual(
    protocol.selectionRule.candidateMustKeepEveryCleanReplicateAtOrBelowDifFlagRate,
    0.10
  );
  assert.strictEqual(protocol.selectionRule.minimumAggregateImplantedDifSensitivity, 0.70);
  assert.strictEqual(protocol.selectionRule.freezeSelectedMethodBeforeConfirmatory, true);

  assert.strictEqual(protocol.confirmatory.executionAllowedBeforeMethodFreeze, false);
  assert.strictEqual(protocol.confirmatory.replicatesPerPanel, 5);
  assert.strictEqual(protocol.confirmatory.participantsPerReplicate, 1200);
  assert.strictEqual(protocol.confirmatory.acceptance.everyCleanReplicateMaximumDifFlagRate, 0.10);
  assert.strictEqual(protocol.confirmatory.acceptance.minimumAggregateImplantedDifSensitivity, 0.70);
  assert.strictEqual(protocol.confirmatory.acceptance.runnerUpFallbackAllowed, false);
  assert.strictEqual(protocol.confirmatory.acceptance.postExecutionThresholdChangesAllowed, false);

  const developmentSeeds = new Set([
    protocol.development.cleanPanel.seedPrefix,
    protocol.development.implantedDifPanel.seedPrefix
  ]);
  assert.ok(!developmentSeeds.has(protocol.confirmatory.cleanSeedPrefix));
  assert.ok(!developmentSeeds.has(protocol.confirmatory.implantedSeedPrefix));
  assert.notStrictEqual(protocol.confirmatory.cleanSeedPrefix, protocol.confirmatory.implantedSeedPrefix);
})();

(function validateGovernanceLocks() {
  assert.strictEqual(protocol.governance.syntheticOnly, true);
  for (const key of [
    'containsRealParticipants',
    'automaticUpload',
    'autoPublishNorms',
    'autoCpiToIq',
    'productNormEligible',
    'productIqUnlocked'
  ]) {
    assert.strictEqual(protocol.governance[key], false, `${key} must remain false`);
  }
  assert.strictEqual(protocol.governance.requiresHumanPsychometricReviewForAnyFutureUnlock, true);
})();

console.log('Calibration v12 prospective DIF matching protocol validation PASS');
