#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (['dryRun','installPackages'].includes(key)) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function buildPlan(options = {}) {
  const input = options.input || 'calibration/output/pooled-study/pooled-independent-responses.csv';
  const outDir = options.outDir || 'calibration/output/psychometric-v5';
  const external = options.external || null;
  const generalTheta = path.join(outDir, 'participant-general-theta.csv');
  const generalManifest = path.join(outDir, 'general-theta-manifest.json');
  const steps = [];

  if (options.installPackages) {
    steps.push({ name: 'install-packages', command: 'Rscript', args: ['calibration/analysis/install-packages.R'] });
  }
  steps.push(
    { name: 'reliability', command: 'Rscript', args: ['calibration/analysis/reliability.R', input, path.join(outDir, 'reliability.json')] },
    { name: 'irt', command: 'Rscript', args: ['calibration/analysis/irt_mirt.R', input, outDir] },
    { name: 'age-dif', command: 'Rscript', args: ['calibration/analysis/age_dif.R', input, outDir] },
    { name: 'cfa-invariance', command: 'Rscript', args: ['calibration/analysis/cfa_invariance.R', input, path.join(outDir, 'cfa-invariance.json')] },
    { name: 'general-theta', command: 'Rscript', args: ['calibration/analysis/general_theta.R', path.join(outDir, 'participant-domain-theta.csv'), input, generalTheta, generalManifest] },
    { name: 'research-norming', command: 'Rscript', args: ['calibration/analysis/norming.R', generalTheta, 'theta', outDir] }
  );
  if (external) {
    steps.push({ name: 'external-linking', command: 'Rscript', args: ['calibration/analysis/external_linking.R', input, external, path.join(outDir, 'external-linking.json')] });
  }
  steps.push({
    name: 'readiness-report',
    command: process.execPath,
    args: ['scripts/build-psychometric-readiness-report.js', '--input', input, '--out', outDir]
  });
  return { input, outDir, external, steps };
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function runStep(step, cwd = process.cwd()) {
  const result = spawnSync(step.command, step.args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ALLOW_RESEARCH_STANDARD_SCORE: process.env.ALLOW_RESEARCH_STANDARD_SCORE || '0' }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${step.name} failed with exit code ${result.status}`);
}

function writeManifest(plan, outDir, completedSteps, status, error = null) {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {
    version: 'CIL-PSYCH-PIPELINE-2026.09.1',
    generatedAt: new Date().toISOString(),
    input: plan.input,
    external: plan.external,
    steps: plan.steps.map(step => step.name),
    completedSteps,
    status,
    error: error ? String(error.message || error) : null,
    safety: {
      automaticUpload: false,
      autoRewrite: false,
      autoChangeAnswerKey: false,
      autoPublishNorms: false,
      autoConvertToIq: false,
      productIqUnlocked: false
    }
  };
  fs.writeFileSync(path.join(outDir, 'pipeline-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const plan = buildPlan({
    input: args.input,
    outDir: args.out,
    external: args.external,
    installPackages: args.installPackages
  });

  if (args.dryRun) {
    console.log(JSON.stringify({
      ...plan,
      dryRun: true,
      safety: {
        automaticUpload: false,
        autoMutation: false,
        productIqUnlocked: false
      }
    }, null, 2));
    return plan;
  }

  if (!fs.existsSync(plan.input)) throw new Error(`Missing pooled input: ${plan.input}`);
  if (!commandExists('Rscript')) {
    throw new Error('Rscript is required. Install R, then run calibration/analysis/install-packages.R before the psychometric pipeline.');
  }

  fs.mkdirSync(plan.outDir, { recursive: true });
  const completed = [];
  try {
    for (const step of plan.steps) {
      console.log(`\n=== ${step.name} ===`);
      runStep(step);
      completed.push(step.name);
    }
    writeManifest(plan, plan.outDir, completed, 'success');
    console.log(`\nPsychometric pipeline complete: ${plan.outDir}`);
    console.log('All outputs are research diagnostics. Product IQ remains locked.');
  } catch (error) {
    writeManifest(plan, plan.outDir, completed, 'failed', error);
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

module.exports = { parseArgs, buildPlan, commandExists, runStep, writeManifest, main };
