#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERSION = 'CIL-FULL-PIPELINE-STABILITY-2026.09.1';
const DOMAINS = Object.freeze([
  'verbal-comprehension',
  'fluid-reasoning',
  'visual-spatial',
  'working-memory',
  'processing-speed',
  'quantitative-reasoning'
]);

function parseArgs(argv) {
  const out = {
    replicates: 5,
    participants: 1200,
    seedPrefix: 'cil-v10-full-stability',
    outDir: 'calibration/output/full-pipeline-stability-v10',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--replicates') out.replicates = Number(argv[++i]);
    else if (argv[i] === '--participants') out.participants = Number(argv[++i]);
    else if (argv[i] === '--seed-prefix') out.seedPrefix = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = argv[++i];
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  if (!Number.isInteger(out.replicates) || out.replicates < 2 || out.replicates > 20) {
    throw new Error('replicates must be an integer from 2 to 20');
  }
  if (!Number.isInteger(out.participants) || out.participants < 500) {
    throw new Error('participants must be an integer >= 500');
  }
  if (!out.seedPrefix || out.seedPrefix === 'cil-v10-ci') {
    throw new Error('full stability seedPrefix must be non-empty and distinct from the development seed');
  }
  return out;
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function metricSummary(values) {
  const x = values.map(Number).filter(Number.isFinite);
  if (!x.length) return { mean: null, min: null, max: null };
  return {
    mean: x.reduce((a, b) => a + b, 0) / x.length,
    min: Math.min(...x),
    max: Math.max(...x)
  };
}

function summarizeReports(reports, configuration) {
  const reliability = {};
  for (const domain of DOMAINS) {
    reliability[domain] = {
      alphaRaw: metricSummary(reports.map(r => r.recovery?.reliability?.[domain]?.alphaRaw)),
      omegaTotal: metricSummary(reports.map(r => r.recovery?.reliability?.[domain]?.omegaTotal)),
      omegaHierarchical: metricSummary(reports.map(r => r.recovery?.reliability?.[domain]?.omegaHierarchical))
    };
  }

  const allComplete = reports.length === configuration.replicates
    && reports.every(r => r.status === 'complete-diagnostic')
    && reports.every(r => r.gates?.allStructuralChecksPassed === true)
    && reports.every(r => r.gates?.productNormEligible === false)
    && reports.every(r => r.gates?.productIqUnlocked === false)
    && reports.every(r => r.gates?.autoCpiToIq === false)
    && reports.every(r => r.safety?.containsRealParticipants === false && r.safety?.syntheticOnly === true);

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: allComplete ? 'complete-diagnostic' : 'incomplete-diagnostic',
    configuration: {
      replicates: configuration.replicates,
      participantsPerReplicate: configuration.participants,
      seedPrefix: configuration.seedPrefix,
      developmentSeedExcluded: configuration.seedPrefix !== 'cil-v10-ci',
      design: 'clean-42-item-six-domain-synthetic-pipeline-panel'
    },
    aggregate: {
      reliability,
      cfaConfiguralCfi: metricSummary(reports.map(r => r.recovery?.cfaInvariance?.configural?.cfi)),
      cfaConfiguralRmsea: metricSummary(reports.map(r => r.recovery?.cfaInvariance?.configural?.rmsea)),
      cfaMetricDeltaCfi: metricSummary(reports.map(r => r.recovery?.cfaInvariance?.delta?.metricVsConfiguralCFI)),
      cfaScalarDeltaCfi: metricSummary(reports.map(r => r.recovery?.cfaInvariance?.delta?.scalarVsMetricCFI)),
      generalThetaCorrelationWithTrueG: metricSummary(reports.map(r => r.recovery?.generalTheta?.correlationWithTrueG)),
      generalThetaStandardizedRmse: metricSummary(reports.map(r => r.recovery?.generalTheta?.standardizedRmseVsTrueG)),
      normingBandMeanRecoveryRmse: metricSummary(reports.map(r => r.recovery?.norming?.bandMeanRecoveryRmse)),
      externalPearsonR: metricSummary(reports.map(r => r.recovery?.externalLinking?.pearsonR)),
      externalCpiSlopeBias: metricSummary(reports.map(r => r.recovery?.externalLinking?.cpiSlopeBias)),
      externalAgeSlopeBias: metricSummary(reports.map(r => r.recovery?.externalLinking?.ageSlopeBias)),
      cleanPanelDifFalsePositiveRate: metricSummary(reports.map(r => r.recovery?.cleanPanelDif?.falsePositiveRate))
    },
    replicates: reports.map((r, index) => ({
      replicate: index + 1,
      seed: r.configuration?.seed || null,
      analysisSeed: finite(r.configuration?.analysisSeed),
      status: r.status,
      reliabilityOmegaTotal: Object.fromEntries(DOMAINS.map(domain => [
        domain,
        finite(r.recovery?.reliability?.[domain]?.omegaTotal)
      ])),
      cfaConfiguralCfi: finite(r.recovery?.cfaInvariance?.configural?.cfi),
      cfaConfiguralRmsea: finite(r.recovery?.cfaInvariance?.configural?.rmsea),
      generalThetaCorrelationWithTrueG: finite(r.recovery?.generalTheta?.correlationWithTrueG),
      generalThetaStandardizedRmse: finite(r.recovery?.generalTheta?.standardizedRmseVsTrueG),
      normingBandMeanRecoveryRmse: finite(r.recovery?.norming?.bandMeanRecoveryRmse),
      externalPearsonR: finite(r.recovery?.externalLinking?.pearsonR),
      externalCpiSlopeBias: finite(r.recovery?.externalLinking?.cpiSlopeBias),
      externalAgeSlopeBias: finite(r.recovery?.externalLinking?.ageSlopeBias),
      cleanPanelDifFalsePositiveRate: finite(r.recovery?.cleanPanelDif?.falsePositiveRate)
    })),
    gates: {
      allReplicatesStructurallyComplete: allComplete,
      scientificThresholdsPreRegistered: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    },
    safety: {
      containsRealParticipants: false,
      syntheticOnly: true,
      automaticUpload: false,
      participantBackend: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productNormEligible: false,
      productIqUnlocked: false
    },
    interpretation: 'Multi-seed synthetic stability evidence for the full analysis pipeline only. No population, norming, validity, or IQ claim is unlocked.'
  };
}

function runOne(options, replicate) {
  const id = String(replicate).padStart(2, '0');
  const seed = `${options.seedPrefix}-r${id}`;
  const outDir = path.join(options.outDir, `replicate-${id}`);
  const result = spawnSync(process.execPath, [
    'scripts/run-full-pipeline-recovery.js',
    '--participants', String(options.participants),
    '--seed', seed,
    '--out', outDir
  ], { stdio: 'inherit', env: { ...process.env, ALLOW_RESEARCH_STANDARD_SCORE: '0' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`replicate ${replicate} failed with exit code ${result.status}`);
  return JSON.parse(fs.readFileSync(path.join(outDir, 'full-pipeline-recovery-summary.json'), 'utf8'));
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.dryRun) {
    console.log(JSON.stringify({ version: VERSION, ...options, productIqUnlocked: false }, null, 2));
    return options;
  }
  fs.mkdirSync(options.outDir, { recursive: true });
  const reports = [];
  for (let i = 1; i <= options.replicates; i++) reports.push(runOne(options, i));
  const summary = summarizeReports(reports, options);
  const file = path.join(options.outDir, 'full-pipeline-stability-summary.json');
  fs.writeFileSync(file, JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({
    status: summary.status,
    generalThetaCorrelationWithTrueG: summary.aggregate.generalThetaCorrelationWithTrueG,
    normingBandMeanRecoveryRmse: summary.aggregate.normingBandMeanRecoveryRmse,
    externalCpiSlopeBias: summary.aggregate.externalCpiSlopeBias,
    cleanPanelDifFalsePositiveRate: summary.aggregate.cleanPanelDifFalsePositiveRate,
    productIqUnlocked: summary.gates.productIqUnlocked
  }, null, 2));
  if (summary.status !== 'complete-diagnostic') throw new Error('v10 multi-seed stability study incomplete');
  return summary;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  }
}

module.exports = { VERSION, DOMAINS, parseArgs, metricSummary, summarizeReports, runOne, main };
