#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = { dryRun: false, runR: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--dry-run') out.dryRun = true;
    else if (token === '--run-r') out.runR = true;
    else if (token === '--input') out.input = argv[++i];
    else if (token === '--out') out.out = argv[++i];
  }
  return out;
}

function buildPlan(options = {}) {
  const input = options.input || 'calibration/input/external/icar-sapa.csv';
  const outDir = options.out || 'calibration/output/external-research-v7/icar-sapa';
  const normalizedCsv = path.join(outDir, 'external-scored-responses.csv');
  const steps = [
    {
      name: 'normalize-icar-sapa',
      command: process.execPath,
      args: ['scripts/normalize-icar-sapa.js', input, outDir]
    }
  ];
  if (options.runR) {
    steps.push({
      name: 'external-icar-validation',
      command: 'Rscript',
      args: ['calibration/analysis/external_icar_validation.R', normalizedCsv, outDir]
    });
    steps.push({
      name: 'external-icar-two-factor-interpretation',
      command: 'Rscript',
      args: ['calibration/analysis/external_icar_two_factor.R', normalizedCsv, outDir]
    });
  }
  return {
    version: 'CIL-EXTERNAL-RESEARCH-PACK-2026.09.2',
    input,
    outDir,
    normalizedCsv,
    runR: Boolean(options.runR),
    steps,
    safety: {
      networkFetch: false,
      participantBackend: false,
      automaticUpload: false,
      rawThirdPartyDataCommitted: false,
      productNormEligible: false,
      productIqUnlocked: false
    }
  };
}

function runStep(step) {
  const result = spawnSync(step.command, step.args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${step.name} failed with exit code ${result.status}`);
}

function writeManifest(plan, completed, status, error = null) {
  fs.mkdirSync(plan.outDir, { recursive: true });
  const manifest = {
    version: plan.version,
    generatedAt: new Date().toISOString(),
    input: plan.input,
    outDir: plan.outDir,
    steps: plan.steps.map(step => step.name),
    completedSteps: completed,
    status,
    error: error ? String(error.message || error) : null,
    safety: plan.safety,
    interpretation: {
      use: 'external method validation and psychometric research only',
      populationNorm: false,
      cpiToIqConversion: false,
      directCilNorming: false
    }
  };
  fs.writeFileSync(path.join(plan.outDir, 'external-research-pack-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const plan = buildPlan(args);
  if (args.dryRun) {
    console.log(JSON.stringify({ ...plan, dryRun: true }, null, 2));
    return plan;
  }
  if (!fs.existsSync(plan.input)) throw new Error(`Missing ICAR/SAPA input: ${plan.input}`);
  const completed = [];
  try {
    for (const step of plan.steps) {
      console.log(`\n=== ${step.name} ===`);
      runStep(step);
      completed.push(step.name);
    }
    writeManifest(plan, completed, 'success');
  } catch (error) {
    writeManifest(plan, completed, 'failed', error);
    throw error;
  }
  console.log(`\nExternal research pack complete: ${plan.outDir}`);
  console.log('No external dataset result is eligible for Cognitive IQ Lab product norms or IQ reporting.');
  return plan;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, buildPlan, runStep, writeManifest, main };
