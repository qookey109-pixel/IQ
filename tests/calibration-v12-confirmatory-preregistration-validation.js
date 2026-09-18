'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const prereg = JSON.parse(fs.readFileSync('calibration/v12-confirmatory-preregistration.json', 'utf8'));
const freeze = JSON.parse(fs.readFileSync('calibration/v12-dif-matching-method-freeze.json', 'utf8'));
const result = JSON.parse(fs.readFileSync('calibration/v12-dif-matching-development-result.json', 'utf8'));

function gitBlobSha(path) {
  const content = fs.readFileSync(path);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(prereg.version, 'CIL-V12-CONFIRMATORY-PREREG-2026.09.1');
assert.strictEqual(prereg.status, 'preregistered-design-execution-locked');
assert.strictEqual(prereg.authority.basisMainSha, '4f15e7ad4b294e34c0d4c5156ba2ddc9918e9371');

assert.strictEqual(prereg.selectedMethod.id, 'domain-loo-eap-fixed-theta');
assert.strictEqual(freeze.selectedMethod.id, prereg.selectedMethod.id);
assert.strictEqual(result.selection.selectedMethod, prereg.selectedMethod.id);

assert.strictEqual(prereg.design.replicatesPerPanel, 5);
assert.strictEqual(prereg.design.participantsPerReplicate, 1200);
assert.strictEqual(prereg.design.totalTargetItemsPerReplicate, 42);
assert.strictEqual(prereg.design.cleanPanel.itemDiscriminationMultiplier, 2);
assert.strictEqual(prereg.design.implantedDifPanel.implantedAgeDifEffect, 0.7);

assert.deepStrictEqual(prereg.design.cleanPanel.reservedSeeds, [
  'cil-v12-confirm-clean-r01',
  'cil-v12-confirm-clean-r02',
  'cil-v12-confirm-clean-r03',
  'cil-v12-confirm-clean-r04',
  'cil-v12-confirm-clean-r05'
]);
assert.deepStrictEqual(prereg.design.implantedDifPanel.reservedSeeds, [
  'cil-v12-confirm-implanted-r01',
  'cil-v12-confirm-implanted-r02',
  'cil-v12-confirm-implanted-r03',
  'cil-v12-confirm-implanted-r04',
  'cil-v12-confirm-implanted-r05'
]);

assert.strictEqual(prereg.acceptance.everyCleanReplicateMaximumDifFlagRate, 0.10);
assert.strictEqual(prereg.acceptance.minimumAggregateImplantedDifSensitivity, 0.70);
assert.strictEqual(prereg.acceptance.allTenReplicatesMustComplete, true);
assert.strictEqual(prereg.acceptance.runnerUpFallbackAllowed, false);
assert.strictEqual(prereg.acceptance.postExecutionThresholdChangesAllowed, false);
assert.strictEqual(prereg.acceptance.partialRunInferenceAllowed, false);

assert.strictEqual(prereg.executionLock.executionAuthorized, false);
assert.strictEqual(prereg.executionLock.confirmatorySeedsConsumed, false);
assert.strictEqual(prereg.executionLock.executionRunnerIncludedInThisPreregistration, false);
assert.strictEqual(prereg.executionLock.executionWorkflowIncludedInThisPreregistration, false);
assert.strictEqual(prereg.executionLock.separateExecutionAuthorizationRequired, true);
assert.strictEqual(prereg.executionLock.resultsMayNotBeInspectedBeforeAllReplicatesComplete, true);

assert.strictEqual(prereg.historicalBoundary.v11Verdict, 'failed-confirmatory');
assert.strictEqual(prereg.historicalBoundary.mayReinterpretV11, false);

assert.strictEqual(
  gitBlobSha('calibration/v12-dif-matching-method-freeze.json'),
  prereg.authority.selectedMethodFreezeBlobSha
);
assert.strictEqual(
  gitBlobSha('calibration/v12-dif-matching-development-result.json'),
  prereg.authority.developmentResultBlobSha
);
assert.strictEqual(
  gitBlobSha('calibration/v12-dif-matching-protocol.json'),
  prereg.authority.v12ProtocolBlobSha
);
assert.strictEqual(
  gitBlobSha('calibration/analysis/v12_dif_matching_compare.R'),
  prereg.authority.selectedMethodImplementationBlobSha
);

for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq']) {
  assert.strictEqual(prereg.governance[key], false, key + ' must remain false');
}

console.log('Calibration v12 confirmatory preregistration validation PASS');
