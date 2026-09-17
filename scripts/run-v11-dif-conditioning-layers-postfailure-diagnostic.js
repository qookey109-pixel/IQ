#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERSION = 'CIL-V11-DIF-CONDITIONING-LAYERS-POSTFAILURE-DIAGNOSTIC-2026.09.1';
const BASE_WRAPPER = 'scripts/run-v11-dif-conditioning-postfailure-diagnostic.js';
const LAYERS_R = 'calibration/analysis/v11_dif_conditioning_layers_diagnostic.R';
const TARGET_CONDITION_ID = 'high-information-control';
const TARGET_SEED = 'cil-v11-high-information-control-r01';
const TARGET_ANALYSIS_SEED = 2147221403;

function parseArgs(argv) {
  const out = {
    protocol: 'calibration/confirmatory-reliability-v11.json',
    outDir: 'calibration/output/v11-dif-postfailure-conditioning-layers',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--protocol') out.protocol = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function runCommand(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

function buildDryRun(args) {
  return {
    version: VERSION,
    baseWrapper: BASE_WRAPPER,
    layersDiagnostic: LAYERS_R,
    targetConditionId: TARGET_CONDITION_ID,
    targetSeed: TARGET_SEED,
    targetAnalysisSeed: TARGET_ANALYSIS_SEED,
    protocol: args.protocol,
    outDir: args.outDir,
    conditioningSources: [
      'synthetic-generator-true-domain-theta',
      'pipeline-mirt-2pl-eap',
      'lordif-initial-eap',
      'lordif-iterative-sparse-eap',
      'lordif-final-reported-stats'
    ],
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

function buildAggregate(baseReport, layersReport) {
  const complete = layersReport?.complete === true
    && baseReport?.status === 'post-failure-conditioning-diagnostic-complete';
  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: complete
      ? 'post-failure-conditioning-layer-isolation-complete'
      : 'post-failure-conditioning-layer-isolation-incomplete',
    scope: baseReport.scope,
    sourceEvidence: baseReport.sourceEvidence,
    priorFinding: baseReport.finding,
    thetaRecoveryAudit: baseReport.thetaRecoveryAudit,
    conditioningLayers: {
      method: layersReport.method,
      summary: layersReport.summary,
      finding: layersReport.finding,
      domains: layersReport.domains
    },
    productionEffectSizeDefect: baseReport.productionEffectSizeDefect,
    governance: {
      postFailureDiagnosticOnly: true,
      confirmatoryVerdictRemains: 'failed-confirmatory',
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    },
    interpretation: 'Post-failure diagnostic only. This isolates DIF behavior across true theta, pipeline 2PL EAP theta, lordif initial EAP theta, lordif iterative sparse theta, and the final lordif-reported result. It does not retroactively alter v11 or any frozen threshold.'
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
    BASE_WRAPPER,
    '--protocol', args.protocol,
    '--out', args.outDir
  ]);

  const replicateRoot = path.join(args.outDir, TARGET_CONDITION_ID, 'replicate-01');
  const input = path.join(replicateRoot, 'private-synthetic', 'calibration-responses.csv');
  const truth = path.join(replicateRoot, 'private-synthetic', 'v11-true-domain-theta.csv');
  const pipelineTheta = path.join(replicateRoot, 'analysis', 'participant-domain-theta.csv');
  const basePath = path.join(args.outDir, 'v11-dif-postfailure-conditioning-diagnostic.json');
  const layersPrivatePath = path.join(args.outDir, 'v11-dif-conditioning-layers-private-diagnostic.json');

  for (const required of [input, truth, pipelineTheta, basePath]) {
    if (!fs.existsSync(required)) throw new Error(`Missing conditioning-layer prerequisite: ${required}`);
  }

  runCommand('Rscript', [LAYERS_R, input, truth, pipelineTheta, layersPrivatePath], {
    CIL_ANALYSIS_SEED: String(TARGET_ANALYSIS_SEED)
  });

  const baseReport = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const layersReport = JSON.parse(fs.readFileSync(layersPrivatePath, 'utf8'));
  const report = buildAggregate(baseReport, layersReport);
  const outputPath = path.join(args.outDir, 'v11-dif-postfailure-conditioning-layers-diagnostic.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');

  console.log(JSON.stringify({
    status: report.status,
    classification: report.conditioningLayers.finding?.classification,
    trueThetaMaterialFlags: report.conditioningLayers.finding?.trueThetaMaterialFlags,
    pipelineEapMaterialFlags: report.conditioningLayers.finding?.pipelineEapMaterialFlags,
    lordifInitialMaterialFlags: report.conditioningLayers.finding?.lordifInitialMaterialFlags,
    lordifSparseMaterialFlags: report.conditioningLayers.finding?.lordifSparseMaterialFlags,
    lordifFinalMaterialFlags: report.conditioningLayers.finding?.lordifFinalMaterialFlags,
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
  BASE_WRAPPER,
  LAYERS_R,
  TARGET_CONDITION_ID,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  parseArgs,
  buildDryRun,
  buildAggregate,
  main
};
