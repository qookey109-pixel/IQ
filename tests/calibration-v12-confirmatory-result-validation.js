'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const result = JSON.parse(fs.readFileSync(path.join(root, 'calibration', 'v12-confirmatory-result.json'), 'utf8'));
const executedAuthorityPath = path.join(root, 'calibration', 'v12-confirmatory-execution-authority.executed.json');
const activeAuthorityPath = path.join(root, 'calibration', 'v12-confirmatory-execution-authority.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(result.version, 'CIL-V12-CONFIRMATORY-RESULT-2026.09.1');
assert.strictEqual(result.status, 'confirmatory-pass');
assert.strictEqual(result.selectedMethod, 'domain-loo-eap-fixed-theta');
assert.strictEqual(result.authority.executionCommit, '9b12979a1083d008e4b3165d94de71b3ab37b80c');
assert.strictEqual(result.authority.workflowRunId, 35343975015);
assert.strictEqual(result.authority.aggregateArtifactId, 10546092439);
assert.strictEqual(result.completion.allTenReplicatesComplete, true);
assert.strictEqual(result.completion.confirmatorySeedsConsumed, true);
assert.deepStrictEqual(result.clean.replicateFalsePositiveRates, [0.0238, 0.0476, 0, 0.0238, 0.0238]);
assert.strictEqual(result.clean.maximumReplicateFalsePositiveRate, 0.0476);
assert.strictEqual(result.clean.threshold, 0.10);
assert.strictEqual(result.clean.pass, true);
assert.strictEqual(result.implanted.knownDifControlsObserved, 30);
assert.strictEqual(result.implanted.knownDifControlsDetected, 26);
assert.strictEqual(result.implanted.aggregateSensitivity, 26 / 30);
assert.strictEqual(result.implanted.threshold, 0.70);
assert.strictEqual(result.implanted.pass, true);
assert.strictEqual(result.historicalBoundary.v11Verdict, 'failed-confirmatory');
assert.strictEqual(result.historicalBoundary.v11Reinterpreted, false);

assert.strictEqual(fs.existsSync(activeAuthorityPath), false, 'Active authority must be removed after one-time execution');
assert.strictEqual(gitBlobSha(executedAuthorityPath), result.authority.executionAuthorityBlobSha);

for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq','autoPublishNorms']) {
  assert.strictEqual(result.governance[key], false, key + ' must remain false');
}

console.log('Calibration v12 confirmatory result validation PASS');
