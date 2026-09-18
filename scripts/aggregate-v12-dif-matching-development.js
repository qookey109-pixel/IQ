#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  VERSION,
  CANDIDATES,
  chooseMethod
} = require('./run-v12-dif-matching-development.js');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push.apply(out, walk(p));
    else if (name === 'v12-dif-matching-development-summary.json') out.push(p);
  }
  return out;
}

function sum(xs) {
  return xs.reduce(function(a, b) { return a + b; }, 0);
}

function combine(entries) {
  const rates = [];
  entries.forEach(function(x) {
    (x.replicateDifFalsePositiveRates || []).forEach(function(rate) {
      if (Number.isFinite(Number(rate))) rates.push(Number(rate));
    });
  });
  const knownObserved = sum(entries.map(function(x) { return Number(x.knownDifControlsObserved || 0); }));
  const knownDetected = sum(entries.map(function(x) { return Number(x.knownDifControlsDetected || 0); }));
  const nullObserved = sum(entries.map(function(x) { return Number(x.nullDifItemsObserved || 0); }));
  const nullFlagged = sum(entries.map(function(x) { return Number(x.nullDifItemsFlagged || 0); }));
  return {
    complete: entries.length === 5 && entries.every(function(x) { return x.complete === true; }),
    replicates: entries.length,
    knownDifControlsObserved: knownObserved,
    knownDifControlsDetected: knownDetected,
    implantedDifSensitivity: knownObserved ? knownDetected / knownObserved : null,
    nullDifItemsObserved: nullObserved,
    nullDifItemsFlagged: nullFlagged,
    aggregateDifFalsePositiveRate: nullObserved ? nullFlagged / nullObserved : null,
    maximumReplicateDifFalsePositiveRate: rates.length ? Math.max.apply(Math, rates) : null,
    replicateDifFalsePositiveRates: rates
  };
}

function aggregateShards(shards) {
  const byPanel = { clean: [], implanted: [] };
  shards.forEach(function(report) {
    const cfg = report.configuration || {};
    if (!['clean','implanted'].includes(cfg.panelScope)) throw new Error('Shard must contain one panel');
    if (cfg.participantsPerReplicate !== 1200 || cfg.replicatesPerPanel !== 1 || cfg.targetsPerDomain !== 7) {
      throw new Error('Shard does not match preregistered full development configuration');
    }
    if (!Number.isInteger(cfg.replicateStart) || cfg.replicateStart < 1 || cfg.replicateStart > 5) {
      throw new Error('Shard replicate index must be 1..5');
    }
    if (report.governance?.confirmatorySeedsUsed !== false ||
        report.governance?.productNormEligible !== false ||
        report.governance?.productIqUnlocked !== false ||
        report.governance?.autoCpiToIq !== false) {
      throw new Error('Shard governance lock drift');
    }
    byPanel[cfg.panelScope].push(report);
  });

  for (const panel of ['clean','implanted']) {
    const ids = byPanel[panel].map(function(x) { return x.configuration.replicateStart; }).sort();
    if (ids.join(',') !== '1,2,3,4,5') throw new Error('Expected exactly replicates 1..5 for ' + panel);
  }

  const aggregate = { clean: {}, implanted: {} };
  for (const panel of ['clean','implanted']) {
    for (const method of ['lordif-iterative-current'].concat(CANDIDATES)) {
      const entries = byPanel[panel].map(function(x) { return x.aggregate[panel][method]; });
      aggregate[panel][method] = combine(entries);
    }
  }

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: 'complete-development',
    configuration: {
      participantsPerReplicate: 1200,
      replicatesPerPanel: 5,
      targetsPerDomain: 7,
      selectionEligible: true,
      executionMode: '10-shard-parallel-development'
    },
    aggregate: aggregate,
    selection: chooseMethod(aggregate, true),
    governance: {
      developmentOnly: true,
      confirmatorySeedsUsed: false,
      confirmatoryExecutionAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function main(argv) {
  const args = argv || process.argv.slice(2);
  const inputDir = args[0];
  const outFile = args[1] || path.join(inputDir || '.', 'v12-dif-matching-development-summary.json');
  if (!inputDir || !fs.existsSync(inputDir)) throw new Error('Input shard directory is required');
  const files = walk(inputDir);
  const shards = files.map(function(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); });
  const report = aggregateShards(shards);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    status: report.status,
    selectedMethod: report.selection.selectedMethod,
    selectionStatus: report.selection.status,
    productIqUnlocked: report.governance.productIqUnlocked
  }, null, 2));
  return report;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = { walk, combine, aggregateShards, main };
