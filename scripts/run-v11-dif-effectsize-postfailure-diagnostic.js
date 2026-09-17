#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseCsv } = require('./run-full-pipeline-recovery.js');

const VERSION = 'CIL-V11-DIF-EFFECTSIZE-POSTFAILURE-DIAGNOSTIC-2026.09.1';
const BASE_DIAGNOSTIC = 'scripts/run-v11-dif-postfailure-diagnostic.js';
const EFFECTSIZE_DIAGNOSTIC = 'calibration/analysis/v11_dif_effectsize_diagnostic.R';
const TARGET_SEED = 'cil-v11-high-information-control-r01';
const TARGET_ANALYSIS_SEED = 2147221403;
const REFERENCE_R2_CHANGE = 0.02;

function parseArgs(argv) {
  const out = {
    protocol: 'calibration/confirmatory-reliability-v11.json',
    outDir: 'calibration/output/v11-dif-postfailure-effectsize-diagnostic',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--protocol') out.protocol = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function effectByItem(effectReport) {
  return new Map((effectReport?.items || []).map(item => [String(item.itemId), item]));
}

function enrichReport(baseReport, productionDifRows, effectReport) {
  const okProduction = productionDifRows.filter(row => String(row.status) === 'ok' && row.itemId);
  const productionEffectValues = okProduction
    .map(row => finiteOrNull(row.difDeltaR2))
    .filter(Number.isFinite);
  const effects = effectByItem(effectReport);

  const flaggedItems = (baseReport?.reproduction?.flaggedItems || []).map(item => {
    const effect = effects.get(String(item.itemId)) || null;
    return {
      itemId: item.itemId,
      domain: item.domain,
      statisticalFlag: true,
      productionDifDeltaR2: productionDifRows.find(row => String(row.itemId) === String(item.itemId))
        ? finiteOrNull(productionDifRows.find(row => String(row.itemId) === String(item.itemId)).difDeltaR2)
        : null,
      lordifStats: effect ? {
        chi12P: finiteOrNull(effect.chi12P),
        chi13P: finiteOrNull(effect.chi13P),
        chi23P: finiteOrNull(effect.chi23P),
        pseudo12McFadden: finiteOrNull(effect.pseudo12McFadden),
        pseudo13McFadden: finiteOrNull(effect.pseudo13McFadden),
        pseudo23McFadden: finiteOrNull(effect.pseudo23McFadden),
        referenceR2Change: REFERENCE_R2_CHANGE,
        materialByMcFaddenR2: effect.materialByMcFaddenR2 === true
      } : null,
      ageBands: item.ageBands,
      correctRateRange: item.correctRateRange
    };
  });

  const materialItems = (effectReport?.items || [])
    .filter(item => item.materialByMcFaddenR2 === true)
    .map(item => ({
      itemId: item.itemId,
      domain: item.domain,
      statisticalFlag: item.statisticalFlag === true,
      pseudo13McFadden: finiteOrNull(item.pseudo13McFadden)
    }));

  const extractionComplete = effectReport?.summary?.statsExtractionComplete === true
    && Number(effectReport?.summary?.analyzedItems) === 42;

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: baseReport?.reproduction?.matchesSourceEvidence === true && extractionComplete
      ? 'post-failure-effectsize-diagnostic-complete'
      : 'post-failure-effectsize-diagnostic-incomplete',
    scope: baseReport.scope,
    sourceEvidence: baseReport.sourceEvidence,
    reproduction: {
      ...baseReport.reproduction,
      flaggedItems
    },
    effectSizeAudit: {
      source: 'lordif fit$stats',
      criterion: effectReport?.method?.criterion || 'Chisqr',
      alpha: finiteOrNull(effectReport?.method?.alpha),
      pseudoR2: effectReport?.method?.pseudoR2 || 'McFadden',
      referenceR2Change: REFERENCE_R2_CHANGE,
      analyzedItems: finiteOrNull(effectReport?.summary?.analyzedItems),
      statisticalFlags: finiteOrNull(effectReport?.summary?.statisticalFlags),
      statisticalFlagRate: finiteOrNull(effectReport?.summary?.statisticalFlagRate),
      materialByMcFaddenR2: finiteOrNull(effectReport?.summary?.materialByMcFaddenR2),
      materialByMcFaddenR2Rate: finiteOrNull(effectReport?.summary?.materialByMcFaddenR2Rate),
      extractionComplete,
      productionDifDeltaR2AvailableItems: productionEffectValues.length,
      productionDifDeltaR2MissingItems: okProduction.length - productionEffectValues.length,
      materialItems,
      semantics: {
        statisticalFlag: 'lordif Chisqr likelihood-ratio significance at alpha=0.01',
        materialReference: 'pseudo13.McFadden >= 0.02, matching lordif R2 criterion semantics',
        sameMeaning: false
      }
    },
    generatorAudit: baseReport.generatorAudit,
    governance: {
      ...baseReport.governance,
      confirmatoryVerdictRemains: 'failed-confirmatory',
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    },
    interpretation: 'Post-failure diagnostic only. It separates lordif chi-square statistical DIF flags from McFadden pseudo-R2 effect-size evidence. It does not retroactively alter the frozen v11 failed-confirmatory verdict or any governance threshold.'
  };
}

function buildDryRun(args) {
  return {
    version: VERSION,
    baseDiagnostic: BASE_DIAGNOSTIC,
    effectSizeDiagnostic: EFFECTSIZE_DIAGNOSTIC,
    targetSeed: TARGET_SEED,
    targetAnalysisSeed: TARGET_ANALYSIS_SEED,
    referenceR2Change: REFERENCE_R2_CHANGE,
    protocol: args.protocol,
    outDir: args.outDir,
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

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.dryRun) {
    const dry = buildDryRun(args);
    console.log(JSON.stringify(dry, null, 2));
    return dry;
  }

  runCommand(process.execPath, [
    BASE_DIAGNOSTIC,
    '--protocol', args.protocol,
    '--out', args.outDir
  ]);

  const replicateRoot = path.join(args.outDir, 'high-information-control', 'replicate-01');
  const input = path.join(replicateRoot, 'private-synthetic', 'calibration-responses.csv');
  const ageDif = path.join(replicateRoot, 'analysis', 'age-dif.csv');
  const basePath = path.join(args.outDir, 'v11-dif-postfailure-diagnostic.json');
  const effectPath = path.join(args.outDir, 'v11-dif-effectsize-private-diagnostic.json');

  for (const required of [input, ageDif, basePath]) {
    if (!fs.existsSync(required)) throw new Error(`Missing diagnostic prerequisite: ${required}`);
  }

  runCommand('Rscript', [EFFECTSIZE_DIAGNOSTIC, input, effectPath], {
    CIL_ANALYSIS_SEED: String(TARGET_ANALYSIS_SEED)
  });

  const baseReport = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const productionDifRows = parseCsv(fs.readFileSync(ageDif, 'utf8'));
  const effectReport = JSON.parse(fs.readFileSync(effectPath, 'utf8'));
  const report = enrichReport(baseReport, productionDifRows, effectReport);

  const outputPath = path.join(args.outDir, 'v11-dif-postfailure-effectsize-diagnostic.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');

  console.log(JSON.stringify({
    status: report.status,
    statisticalFlags: report.effectSizeAudit.statisticalFlags,
    materialByMcFaddenR2: report.effectSizeAudit.materialByMcFaddenR2,
    productionDifDeltaR2AvailableItems: report.effectSizeAudit.productionDifDeltaR2AvailableItems,
    extractionComplete: report.effectSizeAudit.extractionComplete,
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
  BASE_DIAGNOSTIC,
  EFFECTSIZE_DIAGNOSTIC,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  REFERENCE_R2_CHANGE,
  parseArgs,
  finiteOrNull,
  effectByItem,
  enrichReport,
  buildDryRun,
  main
};
