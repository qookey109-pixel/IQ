'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const runner = require('../scripts/run-v12-confirmatory.js');

const root = path.join(__dirname, '..');
const proposalPath = path.join(root, 'calibration', 'v12-confirmatory-execution-authority.proposed.json');
const activePath = path.join(root, 'calibration', 'v12-confirmatory-execution-authority.json');
const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(proposal.version, 'CIL-V12-CONFIRMATORY-EXECUTION-AUTHORITY-2026.09.1');
assert.strictEqual(proposal.status, 'prepared-not-authorized');
assert.strictEqual(proposal.activationState, 'inactive-proposal');
assert.strictEqual(proposal.executionAuthorized, false);
assert.strictEqual(proposal.userAuthorizationRecorded, false);
assert.strictEqual(proposal.executionScope, 'all-10-preregistered-replicates');
assert.strictEqual(proposal.selectedMethod, 'domain-loo-eap-fixed-theta');

assert.strictEqual(
  proposal.preregistrationBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'v12-confirmatory-preregistration.json'))
);
assert.strictEqual(
  proposal.runnerBlobSha,
  gitBlobSha(path.join(root, 'scripts', 'run-v12-confirmatory.js'))
);
assert.strictEqual(
  proposal.analysisBlobSha,
  gitBlobSha(path.join(root, 'calibration', 'analysis', 'v12_dif_confirmatory_selected.R'))
);

assert.strictEqual(proposal.reservedDesign.cleanReplicates, 5);
assert.strictEqual(proposal.reservedDesign.implantedReplicates, 5);
assert.strictEqual(proposal.reservedDesign.participantsPerReplicate, 1200);
assert.strictEqual(proposal.reservedDesign.targetItemsPerReplicate, 42);
assert.strictEqual(proposal.reservedDesign.cleanMaximumReplicateDifFlagRate, 0.10);
assert.strictEqual(proposal.reservedDesign.minimumAggregateImplantedDifSensitivity, 0.70);

for (const key of [
  'partialExecutionAllowed',
  'seedOverrideAllowed',
  'methodOverrideAllowed',
  'thresholdOverrideAllowed',
  'runnerUpFallbackAllowed',
  'partialRunInferenceAllowed'
]) {
  assert.strictEqual(proposal.executionBoundary[key], false, key + ' must remain false');
}

assert.strictEqual(proposal.seedState.confirmatorySeedsConsumed, false);
for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq','autoPublishNorms']) {
  assert.strictEqual(proposal.governance[key], false, key + ' must remain false');
}

assert.strictEqual(fs.existsSync(activePath), false, 'Active execution authority must remain absent during preparation');
assert.throws(
  () => runner.requireExecutionAuthority(activePath),
  /execution authority file is absent/,
  'Runner must remain non-executable until a separate active authority file is created'
);

console.log('Calibration v12 confirmatory authority preparation validation PASS');
