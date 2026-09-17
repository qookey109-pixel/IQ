#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  loadProtocol,
  generateProfiledSynthetic,
  makePlan
} = require('./run-confirmatory-reliability-v11.js');
const { rowsToCsv } = require('./generate-synthetic-calibration.js');
const {
  parseCsv,
  externalRowsToCsv,
  generateSyntheticExternal
} = require('./run-full-pipeline-recovery.js');

const VERSION = 'CIL-V11-DIF-POSTFAILURE-DIAGNOSTIC-2026.09.1';
const TARGET_CONDITION_ID = 'high-information-control';
const TARGET_REPLICATE = 1;
const TARGET_SEED = 'cil-v11-high-information-control-r01';
const TARGET_ANALYSIS_SEED = 2147221403;
const SOURCE_CONFIRMATORY_RUN_ID = 35185794369;
const SOURCE_EXECUTION_COMMIT = '586f22d4b2ec405ae5ffd68def0f00f5b3423c73';
const SOURCE_OBSERVED_DIF_ROWS = 42;
const SOURCE_OBSERVED_DIF_FLAGS = 5;
const SOURCE_OBSERVED_DIF_RATE = SOURCE_OBSERVED_DIF_FLAGS / SOURCE_OBSERVED_DIF_ROWS;

function parseArgs(argv) {
  const out = {
    protocol: 'calibration/confirmatory-reliability-v11.json',
    outDir: 'calibration/output/v11-dif-postfailure-diagnostic',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--protocol') out.protocol = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function truthy(value) {
  return value === true || ['true', '1', 'yes', 'y', 'flagged'].includes(String(value ?? '').trim().toLowerCase());
}

function runCommand(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function buildDiagnosticPlan(protocol, outRoot) {
  const condition = protocol.design.conditions.find(x => x.id === TARGET_CONDITION_ID);
  if (!condition) throw new Error(`Missing frozen condition ${TARGET_CONDITION_ID}`);
  if (Number(condition.itemDiscriminationMultiplier) !== 2) {
    throw new Error('High-information multiplier drift; diagnostic refuses to continue');
  }
  if (condition.expectedReliabilityScreenPass !== true) {
    throw new Error('High-information reliability expectation drift; diagnostic refuses to continue');
  }
  if (protocol.design.participantsPerReplicate !== 1200 || protocol.design.replicatesPerCondition !== 3) {
    throw new Error('Frozen v11 sample design drift; diagnostic refuses to continue');
  }
  if (Number(protocol.acceptance.maximumCleanPanelDifFalsePositiveRate) !== 0.10) {
    throw new Error('Frozen clean-DIF threshold drift; diagnostic refuses to continue');
  }
  if (protocol.acceptance.noPostExecutionThresholdChanges !== true) {
    throw new Error('Frozen no-post-execution-threshold-change lock is missing');
  }

  const plan = makePlan(protocol, condition, TARGET_REPLICATE, outRoot);
  if (plan.seed !== TARGET_SEED || plan.analysisSeed !== TARGET_ANALYSIS_SEED) {
    throw new Error(`Target seed drift: ${plan.seed}/${plan.analysisSeed}`);
  }

  return {
    ...plan,
    condition,
    diagnosticVersion: VERSION,
    sourceEvidence: {
      confirmatoryRunId: SOURCE_CONFIRMATORY_RUN_ID,
      executionCommit: SOURCE_EXECUTION_COMMIT,
      confirmatoryVerdict: 'failed-confirmatory',
      observedDifRows: SOURCE_OBSERVED_DIF_ROWS,
      observedDifFlags: SOURCE_OBSERVED_DIF_FLAGS,
      observedDifFalsePositiveRate: SOURCE_OBSERVED_DIF_RATE
    },
    governance: {
      postFailureDiagnosticOnly: true,
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function summarizeAgeBandPattern(rows, itemId) {
  const itemRows = rows.filter(row => row.itemId === itemId);
  const grouped = new Map();
  for (const row of itemRows) {
    const band = String(row.ageBand || 'unknown');
    if (!grouped.has(band)) grouped.set(band, []);
    grouped.get(band).push(row);
  }
  const ageBands = [...grouped.entries()].map(([ageBand, group]) => ({
    ageBand,
    n: group.length,
    meanAgeYears: mean(group.map(row => row.ageYears)),
    correctRate: mean(group.map(row => Number(row.correct) === 1 ? 1 : 0)),
    skipRate: mean(group.map(row => Number(row.skipped) === 1 ? 1 : 0)),
    timeoutRate: mean(group.map(row => Number(row.timeout) === 1 ? 1 : 0))
  })).sort((a, b) => (a.meanAgeYears ?? 999) - (b.meanAgeYears ?? 999));

  const correctRates = ageBands.map(x => x.correctRate).filter(Number.isFinite);
  return {
    ageBands,
    correctRateRange: correctRates.length ? {
      min: Math.min(...correctRates),
      max: Math.max(...correctRates),
      spread: Math.max(...correctRates) - Math.min(...correctRates)
    } : { min: null, max: null, spread: null }
  };
}

function buildDiagnosticReport(plan, generated, difRows) {
  const okRows = difRows.filter(row => String(row.status) === 'ok' && row.itemId);
  const flaggedRows = okRows.filter(row => truthy(row.difFlag));
  const falsePositiveRate = okRows.length ? flaggedRows.length / okRows.length : null;
  const threshold = Number(plan.condition ? 0.10 : 0.10);

  const flaggedItems = flaggedRows.map(row => {
    const pattern = summarizeAgeBandPattern(generated.rows, String(row.itemId));
    return {
      itemId: String(row.itemId),
      domain: row.domain || null,
      difFlag: true,
      difDeltaR2: finite(row.difDeltaR2),
      ...pattern
    };
  }).sort((a, b) => a.itemId.localeCompare(b.itemId, 'en'));

  const flaggedByDomain = {};
  for (const item of flaggedItems) {
    const key = item.domain || 'unknown';
    flaggedByDomain[key] = (flaggedByDomain[key] || 0) + 1;
  }

  const reproductionMatchesSourceEvidence = okRows.length === SOURCE_OBSERVED_DIF_ROWS
    && flaggedRows.length === SOURCE_OBSERVED_DIF_FLAGS
    && Math.abs((falsePositiveRate ?? NaN) - SOURCE_OBSERVED_DIF_RATE) < 1e-12;

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: reproductionMatchesSourceEvidence
      ? 'post-failure-diagnostic-reproduced'
      : 'post-failure-diagnostic-reproduction-drift',
    scope: {
      conditionId: TARGET_CONDITION_ID,
      replicate: TARGET_REPLICATE,
      seed: plan.seed,
      analysisSeed: plan.analysisSeed,
      participants: plan.participants,
      itemDiscriminationMultiplier: Number(plan.condition.itemDiscriminationMultiplier)
    },
    sourceEvidence: plan.sourceEvidence,
    reproduction: {
      difRows: okRows.length,
      difFlags: flaggedRows.length,
      difFalsePositiveRate: falsePositiveRate,
      frozenMaximumCleanPanelDifFalsePositiveRate: threshold,
      cleanDifScreenPass: Number.isFinite(falsePositiveRate) && falsePositiveRate <= threshold,
      matchesSourceEvidence: reproductionMatchesSourceEvidence,
      flaggedByDomain,
      flaggedItems
    },
    generatorAudit: {
      explicitAgeTermInResponseProbability: false,
      responseProbabilityInputs: [
        'item discrimination × frozen condition multiplier',
        'synthetic domain theta',
        'item difficulty'
      ],
      interpretation: 'The v11 synthetic response probability does not directly condition on age. DIF flags in this clean generator are therefore false-positive candidates that require diagnostic review rather than threshold rewriting.'
    },
    governance: {
      postFailureDiagnosticOnly: true,
      confirmatoryVerdictRemains: 'failed-confirmatory',
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function buildDryRun(plan) {
  return {
    version: VERSION,
    target: {
      conditionId: TARGET_CONDITION_ID,
      replicate: TARGET_REPLICATE,
      seed: plan.seed,
      analysisSeed: plan.analysisSeed,
      participants: plan.participants,
      itemDiscriminationMultiplier: Number(plan.condition.itemDiscriminationMultiplier)
    },
    sourceEvidence: plan.sourceEvidence,
    frozenCleanDifThreshold: 0.10,
    governance: plan.governance
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const protocol = loadProtocol(args.protocol);
  const plan = buildDiagnosticPlan(protocol, args.outDir);

  if (args.dryRun) {
    const dry = buildDryRun(plan);
    console.log(JSON.stringify(dry, null, 2));
    return dry;
  }

  fs.mkdirSync(plan.dataDir, { recursive: true });
  fs.mkdirSync(plan.analysisDir, { recursive: true });

  const generated = generateProfiledSynthetic({
    participants: plan.participants,
    seed: plan.seed,
    condition: plan.condition
  });
  if (generated.manifest.administeredUniqueItems !== 42) {
    throw new Error(`Expected 42 administered items, observed ${generated.manifest.administeredUniqueItems}`);
  }
  if (generated.manifest.administeredControlledDefects.length !== 0) {
    throw new Error('Post-failure diagnostic requires the same clean v11 panel with zero controlled defects');
  }

  fs.writeFileSync(plan.input, rowsToCsv(generated.rows));
  const externalRows = generateSyntheticExternal(generated.participantsMeta, plan.seed);
  fs.writeFileSync(plan.external, externalRowsToCsv(externalRows));

  runCommand(
    plan.pipelineCommand[0],
    plan.pipelineCommand.slice(1),
    { ALLOW_RESEARCH_STANDARD_SCORE: '0' }
  );

  const difPath = path.join(plan.analysisDir, 'age-dif.csv');
  if (!fs.existsSync(difPath)) throw new Error(`Missing DIF output: ${difPath}`);
  const difRows = parseCsv(fs.readFileSync(difPath, 'utf8'));
  const report = buildDiagnosticReport(plan, generated, difRows);

  fs.mkdirSync(args.outDir, { recursive: true });
  const outputPath = path.join(args.outDir, 'v11-dif-postfailure-diagnostic.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');

  console.log(JSON.stringify({
    status: report.status,
    difRows: report.reproduction.difRows,
    difFlags: report.reproduction.difFlags,
    difFalsePositiveRate: report.reproduction.difFalsePositiveRate,
    cleanDifScreenPass: report.reproduction.cleanDifScreenPass,
    matchesSourceEvidence: report.reproduction.matchesSourceEvidence,
    confirmatoryVerdictRemains: report.governance.confirmatoryVerdictRemains,
    productIqUnlocked: report.governance.productIqUnlocked
  }, null, 2));
  return report;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  VERSION,
  TARGET_CONDITION_ID,
  TARGET_REPLICATE,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  SOURCE_CONFIRMATORY_RUN_ID,
  SOURCE_EXECUTION_COMMIT,
  SOURCE_OBSERVED_DIF_ROWS,
  SOURCE_OBSERVED_DIF_FLAGS,
  SOURCE_OBSERVED_DIF_RATE,
  parseArgs,
  finite,
  mean,
  truthy,
  buildDiagnosticPlan,
  summarizeAgeBandPattern,
  buildDiagnosticReport,
  buildDryRun,
  main
};
