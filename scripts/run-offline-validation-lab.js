#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = { mode: 'synthetic' };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (['dryRun','runPsychometrics','installPackages'].includes(key)) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function buildPlan(options = {}) {
  const mode = options.mode || 'synthetic';
  const outDir = options.out || 'calibration/output/offline-validation-v6';
  const steps = [];
  let psychometricInput = null;

  if (mode === 'synthetic') {
    const syntheticDir = path.join(outDir, 'synthetic');
    steps.push({
      name: 'generate-synthetic',
      command: process.execPath,
      args: [
        'scripts/generate-synthetic-calibration.js',
        '--participants', String(options.participants || 600),
        '--seed', String(options.seed || 'cil-offline-v1'),
        '--out', syntheticDir
      ]
    });
    psychometricInput = path.join(syntheticDir, 'calibration-responses.csv');
  } else if (mode === 'local') {
    if (!options.input) throw new Error('--input is required for local mode');
    psychometricInput = options.input;
  } else if (mode === 'public') {
    if (!options.input || !options.mapping) throw new Error('--input and --mapping are required for public mode');
    const publicDir = path.join(outDir, 'public-external');
    steps.push({
      name: 'normalize-public-external',
      command: process.execPath,
      args: ['scripts/normalize-public-dataset.js', options.input, options.mapping, publicDir]
    });
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  if (options.runPsychometrics) {
    if (mode === 'public') {
      throw new Error('Public external responses are source-isolated and cannot be sent into the CIL product-norm psychometric pipeline.');
    }
    const psychOut = path.join(outDir, 'psychometric');
    const args = ['scripts/run-psychometric-pipeline.js', '--input', psychometricInput, '--out', psychOut];
    if (options.installPackages) args.push('--install-packages');
    steps.push({ name: 'run-v5-psychometric-pipeline', command: process.execPath, args });
  }

  return {
    version: 'CIL-OFFLINE-LAB-2026.09.1',
    mode,
    outDir,
    psychometricInput,
    steps,
    sourceIsolation: {
      syntheticProductNormEligible: false,
      publicExternalProductNormEligible: false,
      manualLocalExportRequiresUserAction: true
    },
    safety: {
      automaticUpload: false,
      participantBackend: false,
      databaseRequired: false,
      backgroundCollection: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productIqUnlocked: false
    }
  };
}

function runStep(step, cwd = process.cwd()) {
  const result = spawnSync(step.command, step.args, { cwd, stdio: 'inherit', env: { ...process.env } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${step.name} failed with exit code ${result.status}`);
}

function writeManifest(plan, status, completedSteps = [], error = null) {
  fs.mkdirSync(plan.outDir, { recursive: true });
  const manifest = {
    ...plan,
    generatedAt: new Date().toISOString(),
    status,
    completedSteps,
    error: error ? String(error.message || error) : null
  };
  fs.writeFileSync(path.join(plan.outDir, 'offline-lab-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const plan = buildPlan(options);
  if (options.dryRun) {
    console.log(JSON.stringify({ ...plan, dryRun: true }, null, 2));
    return plan;
  }

  const completed = [];
  try {
    for (const step of plan.steps) {
      console.log(`\n=== ${step.name} ===`);
      runStep(step);
      completed.push(step.name);
    }
    writeManifest(plan, 'success', completed);
    console.log(`\nOffline Validation Lab complete: ${plan.outDir}`);
    console.log('No participant backend was used. Product IQ remains locked.');
  } catch (error) {
    writeManifest(plan, 'failed', completed, error);
    throw error;
  }
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
