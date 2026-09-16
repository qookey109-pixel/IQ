#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const {
  DOMAINS,
  ageBand,
  hashSeed,
  mulberry32,
  normal,
  buildSyntheticBank,
  chooseItemsForParticipant,
  rowsToCsv
} = require('./generate-synthetic-calibration.js');

const {
  analysisSeed,
  externalRowsToCsv,
  generateSyntheticExternal,
  summarizeOutputs
} = require('./run-full-pipeline-recovery.js');

const READINESS_POLICY = require('../calibration/psychometric-readiness-policy.json');

const VERSION = 'CIL-V11-RELIABILITY-SCREEN-2026.09.1';
const PREREGISTRATION_COMMIT = 'e1428b44167cfd2d8f882b11d417b6e8789f8223';
const PREREGISTRATION_SHA256 = 'cb0e7e1359f41681f2a8d758e7f468176214c8984b22c8f09143ec34615ed3ff';

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

function parseArgs(argv) {
  const out = {
    protocol: 'calibration/confirmatory-reliability-v11.json',
    outDir: 'calibration/output/confirmatory-reliability-v11',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--protocol') out.protocol = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function validateProtocol(protocol) {
  if (!protocol || protocol.version !== VERSION) {
    throw new Error(`Unexpected v11 protocol version: ${protocol?.version || 'missing'}`);
  }
  if (protocol.status !== 'preregistered-before-first-execution') {
    throw new Error('v11 protocol must remain preregistered-before-first-execution');
  }
  if (protocol.authority?.readinessPolicyVersion !== READINESS_POLICY.version) {
    throw new Error('v11 readiness policy version drift');
  }

  const acceptance = protocol.acceptance || {};
  const screens = READINESS_POLICY.screens || {};
  const exactPolicyPairs = [
    [acceptance.minimumOmegaTotal, screens.reliability?.minimumOmegaTotal, 'minimumOmegaTotal'],
    [acceptance.minimumConfiguralCFI, screens.cfa?.minimumCFI, 'minimumConfiguralCFI'],
    [acceptance.maximumConfiguralRMSEA, screens.cfa?.maximumRMSEA, 'maximumConfiguralRMSEA'],
    [acceptance.maximumAbsoluteDeltaCFI, screens.cfa?.maximumAbsoluteDeltaCFI, 'maximumAbsoluteDeltaCFI'],
    [acceptance.maximumCleanPanelDifFalsePositiveRate, screens.dif?.maximumMaterialFlagRate, 'maximumCleanPanelDifFalsePositiveRate']
  ];
  for (const [actual, expected, label] of exactPolicyPairs) {
    if (Number(actual) !== Number(expected)) {
      throw new Error(`${label} must match the existing readiness policy (${expected})`);
    }
  }

  if (acceptance.noPostExecutionThresholdChanges !== true) {
    throw new Error('noPostExecutionThresholdChanges must remain true');
  }

  const design = protocol.design || {};
  if (design.panel !== 'pipeline' || design.itemsPerDomain !== 7 || design.domains !== 6) {
    throw new Error('Unexpected v11 panel design');
  }
  if (!Number.isInteger(design.replicatesPerCondition) || design.replicatesPerCondition !== 3) {
    throw new Error('v11 preregistration requires exactly 3 replicates per condition');
  }
  if (!Number.isInteger(design.participantsPerReplicate) || design.participantsPerReplicate !== 1200) {
    throw new Error('v11 preregistration requires exactly 1200 participants per replicate');
  }

  const conditions = Array.isArray(design.conditions) ? design.conditions : [];
  if (conditions.length !== 2) throw new Error('v11 requires exactly two preregistered conditions');
  const weak = conditions.find(x => x.id === 'weak-control');
  const strong = conditions.find(x => x.id === 'high-information-control');
  if (!weak || !strong) throw new Error('v11 weak/high-information controls are required');
  if (Number(weak.itemDiscriminationMultiplier) !== 1 || weak.expectedReliabilityScreenPass !== false) {
    throw new Error('weak-control preregistration drift');
  }
  if (Number(strong.itemDiscriminationMultiplier) !== 2 || strong.expectedReliabilityScreenPass !== true) {
    throw new Error('high-information-control preregistration drift');
  }
  if (!weak.seedPrefix || !strong.seedPrefix || weak.seedPrefix === strong.seedPrefix) {
    throw new Error('v11 seed prefixes must be present and distinct');
  }

  const governance = protocol.governance || {};
  for (const key of ['containsRealParticipants','automaticUpload','autoPublishNorms','autoCpiToIq','productNormEligible','productIqUnlocked']) {
    if (governance[key] !== false) throw new Error(`${key} must remain false`);
  }
  if (governance.syntheticOnly !== true) throw new Error('syntheticOnly must remain true');
  if (governance.requiresHumanPsychometricReviewForAnyFutureUnlock !== true) {
    throw new Error('human psychometric review lock must remain required');
  }
  return protocol;
}

function loadProtocol(file) {
  const text = fs.readFileSync(file, 'utf8');
  const digest = sha256(text);
  if (digest !== PREREGISTRATION_SHA256) {
    throw new Error(`v11 preregistration hash drift: ${digest} != ${PREREGISTRATION_SHA256}`);
  }
  return validateProtocol(JSON.parse(text));
}

function generateProfiledSynthetic({ participants, seed, condition }) {
  const count = Number(participants);
  if (!Number.isInteger(count) || count < 10) throw new Error('participants must be an integer >= 10');
  const multiplier = Number(condition.itemDiscriminationMultiplier);
  if (!(multiplier > 0)) throw new Error('itemDiscriminationMultiplier must be > 0');

  const rand = mulberry32(hashSeed(seed));
  const bank = buildSyntheticBank();
  const rows = [];
  const participantsMeta = [];

  for (let p = 0; p < count; p++) {
    const age = 18 + (p * 13 + Math.floor(rand() * 7)) % 48;
    const band = ageBand(age);
    const g = normal(rand);
    const sourceKey = `synthetic-${String(p + 1).padStart(6, '0')}`;
    const sessionId = `synthetic-session-${String(p + 1).padStart(6, '0')}`;
    const chosen = chooseItemsForParticipant(bank, p, 'pipeline');
    let correctCount = 0;
    const personRows = [];
    const domainTheta = Object.fromEntries(
      DOMAINS.map(domain => [domain, 0.75 * g + 0.66 * normal(rand)])
    );

    for (const item of chosen) {
      const pCorrect = logistic((item.a * multiplier) * (domainTheta[item.domain] - item.b));
      const correct = rand() < pCorrect ? 1 : 0;
      const timeoutChance = item.domain === 'processing-speed' ? 0.035 : 0.006;
      const timeout = rand() < timeoutChance ? 1 : 0;
      const skipped = timeout ? 1 : (rand() < 0.006 ? 1 : 0);
      const finalCorrect = skipped ? 0 : correct;
      correctCount += finalCorrect;
      const correctOption = (hashSeed(item.itemId) + p) % 4;
      const selectedOption = skipped
        ? ''
        : (finalCorrect ? correctOption : (correctOption + 1 + (p % 3)) % 4);
      const secondsBase = item.domain === 'processing-speed' ? 8 : 28;
      const seconds = Math.max(
        1.0,
        Math.round((secondsBase + Math.abs(normal(rand)) * secondsBase * 0.45) * 10) / 10
      );

      personRows.push({
        schemaVersion: 1,
        sourceKey,
        sessionId,
        ageYears: age,
        ageBand: band,
        bankVersion: 'synthetic-v11',
        bankRevision: seed,
        scoringVersion: 'synthetic-method-validation-only',
        formId: `synthetic-v11-${condition.id}-panel-v1`,
        itemId: item.itemId,
        domain: item.domain,
        family: item.family,
        semanticKey: item.semanticKey,
        difficulty: item.difficulty,
        selectedOption,
        correctOption,
        correct: finalCorrect,
        skipped,
        timeout,
        seconds,
        cpi: '',
        iqEstimate: ''
      });
    }

    const cpi = Math.round((correctCount / 42) * 100);
    personRows.forEach(row => { row.cpi = cpi; });
    rows.push(...personRows);
    participantsMeta.push({
      sourceKey,
      sessionId,
      ageYears: age,
      ageBand: band,
      syntheticG: g,
      syntheticDomainTheta: { ...domainTheta },
      cpi
    });
  }

  const administeredIds = new Set(rows.map(row => row.itemId));
  const administeredControlledDefects = bank
    .filter(item => item.defect && administeredIds.has(item.itemId))
    .map(({ itemId, domain, defect }) => ({ itemId, domain, defect }));

  return {
    rows,
    participantsMeta,
    manifest: {
      schemaVersion: 1,
      generator: 'Cognitive IQ Lab v11 confirmatory reliability-screen discrimination',
      generatedAt: new Date().toISOString(),
      seed,
      condition: condition.id,
      panel: 'pipeline',
      itemDiscriminationMultiplier: multiplier,
      participants: count,
      rows: rows.length,
      administeredUniqueItems: administeredIds.size,
      administeredControlledDefects,
      sourceKind: 'synthetic',
      syntheticOnly: true,
      containsRealParticipants: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function makePlan(protocol, condition, replicate, outRoot) {
  const id = String(replicate).padStart(2, '0');
  const seed = `${condition.seedPrefix}-r${id}`;
  const outDir = path.join(outRoot, condition.id, `replicate-${id}`);
  const dataDir = path.join(outDir, 'private-synthetic');
  const analysisDir = path.join(outDir, 'analysis');
  const input = path.join(dataDir, 'calibration-responses.csv');
  const external = path.join(dataDir, 'synthetic-external-validation.csv');
  const seedValue = analysisSeed(seed);
  return {
    version: VERSION,
    design: 'v11-preregistered-reliability-screen-discrimination',
    participants: protocol.design.participantsPerReplicate,
    seed,
    analysisSeed: seedValue,
    outDir,
    dataDir,
    analysisDir,
    input,
    external,
    conditionId: condition.id,
    itemDiscriminationMultiplier: condition.itemDiscriminationMultiplier,
    pipelineCommand: [
      process.execPath,
      'scripts/run-psychometric-pipeline.js',
      '--input', input,
      '--out', analysisDir,
      '--external', external,
      '--analysis-seed', String(seedValue)
    ]
  };
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

function classifyReport(report, protocol, condition) {
  const acceptance = protocol.acceptance;
  const omegas = DOMAINS.map(domain => finite(report.recovery?.reliability?.[domain]?.omegaTotal));
  const allOmegasFinite = omegas.every(Number.isFinite);
  const minimumOmegaTotal = allOmegasFinite ? Math.min(...omegas) : null;
  const reliabilityScreenPass = allOmegasFinite
    && omegas.every(value => value >= Number(acceptance.minimumOmegaTotal));

  const cfa = report.recovery?.cfaInvariance || {};
  const cfi = finite(cfa.configural?.cfi);
  const rmsea = finite(cfa.configural?.rmsea);
  const dMetric = finite(cfa.delta?.metricVsConfiguralCFI);
  const dScalar = finite(cfa.delta?.scalarVsMetricCFI);
  const cfaScreenPass = [cfi, rmsea, dMetric, dScalar].every(Number.isFinite)
    && cfi >= Number(acceptance.minimumConfiguralCFI)
    && rmsea <= Number(acceptance.maximumConfiguralRMSEA)
    && Math.abs(dMetric) <= Number(acceptance.maximumAbsoluteDeltaCFI)
    && Math.abs(dScalar) <= Number(acceptance.maximumAbsoluteDeltaCFI);

  const difFalsePositiveRate = finite(report.recovery?.cleanPanelDif?.falsePositiveRate);
  const cleanDifScreenPass = Number.isFinite(difFalsePositiveRate)
    && difFalsePositiveRate <= Number(acceptance.maximumCleanPanelDifFalsePositiveRate);

  const structuralComplete = report.status === 'complete-diagnostic'
    && report.gates?.allStructuralChecksPassed === true;

  const locksClosed = report.gates?.productNormEligible === false
    && report.gates?.productIqUnlocked === false
    && report.gates?.autoCpiToIq === false
    && report.safety?.syntheticOnly === true
    && report.safety?.containsRealParticipants === false
    && report.safety?.autoPublishNorms === false
    && report.safety?.autoConvertCpiToIq === false
    && report.safety?.productNormEligible === false
    && report.safety?.productIqUnlocked === false;

  const expectedReliabilityScreenPass = condition.expectedReliabilityScreenPass === true;
  const reliabilityClassificationMatched = reliabilityScreenPass === expectedReliabilityScreenPass;

  return {
    seed: report.configuration?.seed || null,
    analysisSeed: finite(report.configuration?.analysisSeed),
    conditionId: condition.id,
    itemDiscriminationMultiplier: Number(condition.itemDiscriminationMultiplier),
    structuralComplete,
    minimumOmegaTotal,
    domainOmegaTotal: Object.fromEntries(
      DOMAINS.map((domain, i) => [domain, omegas[i]])
    ),
    reliabilityScreenPass,
    expectedReliabilityScreenPass,
    reliabilityClassificationMatched,
    cfaScreenPass,
    configuralCFI: cfi,
    configuralRMSEA: rmsea,
    metricDeltaCFI: dMetric,
    scalarDeltaCFI: dScalar,
    cleanDifScreenPass,
    cleanPanelDifFalsePositiveRate: difFalsePositiveRate,
    locksClosed
  };
}

function aggregateResults(protocol, byCondition) {
  const expectedCount = protocol.design.replicatesPerCondition;
  const conditionSummaries = {};
  let allCountsMatch = true;
  let allStructuralComplete = true;
  let allCfaPass = true;
  let allDifPass = true;
  let allReliabilityClassificationsMatch = true;
  let allLocksClosed = true;

  for (const condition of protocol.design.conditions) {
    const rows = byCondition[condition.id] || [];
    if (rows.length !== expectedCount) allCountsMatch = false;
    if (!rows.every(row => row.structuralComplete)) allStructuralComplete = false;
    if (!rows.every(row => row.cfaScreenPass)) allCfaPass = false;
    if (!rows.every(row => row.cleanDifScreenPass)) allDifPass = false;
    if (!rows.every(row => row.reliabilityClassificationMatched)) {
      allReliabilityClassificationsMatch = false;
    }
    if (!rows.every(row => row.locksClosed)) allLocksClosed = false;

    const minimumOmegaValues = rows
      .map(row => finite(row.minimumOmegaTotal))
      .filter(Number.isFinite);

    conditionSummaries[condition.id] = {
      expectedReliabilityScreenPass: condition.expectedReliabilityScreenPass === true,
      itemDiscriminationMultiplier: Number(condition.itemDiscriminationMultiplier),
      replicates: rows,
      minimumOmegaTotalRange: minimumOmegaValues.length ? {
        min: Math.min(...minimumOmegaValues),
        max: Math.max(...minimumOmegaValues)
      } : { min: null, max: null }
    };
  }

  const passed = allCountsMatch
    && allStructuralComplete
    && allCfaPass
    && allDifPass
    && allReliabilityClassificationsMatch
    && allLocksClosed;

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: passed ? 'complete-confirmatory' : 'failed-confirmatory',
    preregistration: {
      commit: PREREGISTRATION_COMMIT,
      sha256: PREREGISTRATION_SHA256,
      version: protocol.version,
      basisMainSha: protocol.authority.basisMainSha,
      executionCommit: process.env.GITHUB_SHA || null
    },
    configuration: {
      panel: protocol.design.panel,
      domains: protocol.design.domains,
      itemsPerDomain: protocol.design.itemsPerDomain,
      replicatesPerCondition: expectedCount,
      participantsPerReplicate: protocol.design.participantsPerReplicate
    },
    conditions: conditionSummaries,
    gates: {
      allCountsMatch,
      allStructuralComplete,
      allCfaPass,
      allCleanDifPass: allDifPass,
      allReliabilityClassificationsMatch,
      allGovernanceLocksClosed: allLocksClosed,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    },
    safety: {
      syntheticOnly: true,
      containsRealParticipants: false,
      automaticUpload: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productNormEligible: false,
      productIqUnlocked: false
    },
    interpretation: protocol.interpretation
  };
}

function runReplicate(protocol, condition, replicate, outRoot) {
  const plan = makePlan(protocol, condition, replicate, outRoot);
  fs.mkdirSync(plan.dataDir, { recursive: true });
  fs.mkdirSync(plan.analysisDir, { recursive: true });

  const generated = generateProfiledSynthetic({
    participants: plan.participants,
    seed: plan.seed,
    condition
  });

  if (generated.manifest.administeredUniqueItems !== 42) {
    throw new Error(`Expected 42 administered items, observed ${generated.manifest.administeredUniqueItems}`);
  }
  if (generated.manifest.administeredControlledDefects.length !== 0) {
    throw new Error('v11 clean pipeline controls must not administer controlled defect items');
  }

  fs.writeFileSync(plan.input, rowsToCsv(generated.rows));
  fs.writeFileSync(
    path.join(plan.dataDir, 'synthetic-truth-private.json'),
    JSON.stringify(generated.participantsMeta, null, 2) + '\n'
  );

  const externalRows = generateSyntheticExternal(generated.participantsMeta, plan.seed);
  fs.writeFileSync(plan.external, externalRowsToCsv(externalRows));

  runCommand(
    plan.pipelineCommand[0],
    plan.pipelineCommand.slice(1),
    { ALLOW_RESEARCH_STANDARD_SCORE: '0' }
  );

  const report = summarizeOutputs(plan, generated);
  return classifyReport(report, protocol, condition);
}

function buildDryRun(protocol, outDir) {
  return {
    version: VERSION,
    preregistrationCommit: PREREGISTRATION_COMMIT,
    preregistrationSha256: PREREGISTRATION_SHA256,
    outDir,
    design: protocol.design,
    acceptance: protocol.acceptance,
    governance: protocol.governance
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const protocol = loadProtocol(args.protocol);

  if (args.dryRun) {
    const plan = buildDryRun(protocol, args.outDir);
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }

  const byCondition = {};
  for (const condition of protocol.design.conditions) {
    byCondition[condition.id] = [];
    for (let replicate = 1; replicate <= protocol.design.replicatesPerCondition; replicate++) {
      console.log(`\n=== v11 ${condition.id} replicate ${replicate} ===`);
      byCondition[condition.id].push(runReplicate(
        protocol,
        condition,
        replicate,
        args.outDir
      ));
    }
  }

  const summary = aggregateResults(protocol, byCondition);
  fs.mkdirSync(args.outDir, { recursive: true });
  const summaryPath = path.join(args.outDir, 'confirmatory-reliability-v11-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log(JSON.stringify({
    status: summary.status,
    weakControlOmegaRange: summary.conditions['weak-control']?.minimumOmegaTotalRange,
    highInformationOmegaRange: summary.conditions['high-information-control']?.minimumOmegaTotalRange,
    allReliabilityClassificationsMatch: summary.gates.allReliabilityClassificationsMatch,
    productIqUnlocked: summary.gates.productIqUnlocked
  }, null, 2));

  if (summary.status !== 'complete-confirmatory') {
    throw new Error('Calibration v11 confirmatory reliability-screen discrimination failed');
  }
  return summary;
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
  PREREGISTRATION_COMMIT,
  PREREGISTRATION_SHA256,
  parseArgs,
  sha256,
  validateProtocol,
  loadProtocol,
  generateProfiledSynthetic,
  makePlan,
  classifyReport,
  aggregateResults,
  buildDryRun,
  main
};
