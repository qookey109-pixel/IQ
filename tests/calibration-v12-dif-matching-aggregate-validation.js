'use strict';

const assert = require('assert');
const { aggregateShards } = require('../scripts/aggregate-v12-dif-matching-development.js');

function method(cleanRate, sensitivity, panel) {
  if (panel === 'clean') {
    return {
      complete: true,
      replicates: 1,
      knownDifControlsObserved: 0,
      knownDifControlsDetected: 0,
      implantedDifSensitivity: null,
      nullDifItemsObserved: 42,
      nullDifItemsFlagged: Math.round(cleanRate * 42),
      aggregateDifFalsePositiveRate: cleanRate,
      maximumReplicateDifFalsePositiveRate: cleanRate,
      replicateDifFalsePositiveRates: [cleanRate]
    };
  }
  return {
    complete: true,
    replicates: 1,
    knownDifControlsObserved: 6,
    knownDifControlsDetected: Math.round(sensitivity * 6),
    implantedDifSensitivity: sensitivity,
    nullDifItemsObserved: 36,
    nullDifItemsFlagged: 1,
    aggregateDifFalsePositiveRate: 1 / 36,
    maximumReplicateDifFalsePositiveRate: 1 / 36,
    replicateDifFalsePositiveRates: [1 / 36]
  };
}

function shard(panel, replicate) {
  const aggregate = { clean: {}, implanted: {} };
  const methods = [
    'lordif-iterative-current',
    'domain-loo-eap-fixed-theta',
    'crossfit-six-factor-map-fixed-theta'
  ];
  methods.forEach(function(name) {
    if (panel === 'clean') {
      aggregate.clean[name] = method(name.includes('crossfit') ? 0.04 : 0.06, 0, 'clean');
      aggregate.implanted[name] = method(0, 0, 'implanted');
    } else {
      aggregate.clean[name] = method(0, 0, 'clean');
      aggregate.implanted[name] = method(0, name.includes('crossfit') ? 5 / 6 : 4 / 6, 'implanted');
    }
  });
  return {
    configuration: {
      participantsPerReplicate: 1200,
      replicatesPerPanel: 1,
      targetsPerDomain: 7,
      panelScope: panel,
      replicateStart: replicate,
      selectionEligible: false
    },
    aggregate: aggregate,
    governance: {
      confirmatorySeedsUsed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

const shards = [];
for (const panel of ['clean','implanted']) {
  for (let r = 1; r <= 5; r++) shards.push(shard(panel, r));
}

const result = aggregateShards(shards);
assert.strictEqual(result.status, 'complete-development');
assert.strictEqual(result.configuration.selectionEligible, true);
assert.strictEqual(result.governance.confirmatorySeedsUsed, false);
assert.strictEqual(result.governance.productIqUnlocked, false);
assert.strictEqual(result.aggregate.clean['crossfit-six-factor-map-fixed-theta'].replicates, 5);
assert.strictEqual(result.aggregate.implanted['crossfit-six-factor-map-fixed-theta'].knownDifControlsObserved, 30);
assert.strictEqual(result.selection.selectedMethod, 'crossfit-six-factor-map-fixed-theta');

console.log('Calibration v12 parallel shard aggregation validation PASS');
