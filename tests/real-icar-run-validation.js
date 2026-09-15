'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const acquire = fs.readFileSync(path.join(root, 'scripts', 'acquire-icar-sapa.R'), 'utf8');
const analysis = fs.readFileSync(path.join(root, 'calibration', 'analysis', 'external_icar_validation.R'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'calibration-v8-real-icar-run.yml'), 'utf8');
const normalizer = fs.readFileSync(path.join(root, 'scripts', 'normalize-icar-sapa.js'), 'utf8');

(function validateSourceAndLicenseBoundary() {
  assert(acquire.includes('doi:10.7910/DVN/AD9RVY'), 'Real run must pin the published ICAR/SAPA DOI');
  assert(acquire.includes('dataverse.harvard.edu/api/access/dataset/:persistentId/'), 'Real run must use the Dataverse dataset API');
  assert(acquire.includes("item_pattern <- '^(LN|MR|VR|R3D)"), 'Acquisition must require ICAR item families');
  assert(acquire.includes("length(item_cols) == 60"), 'Acquisition must locate exactly 60 scored items');
  assert(acquire.includes('Raw third-party data remain in runner-local temporary storage'), 'Acquisition must document raw-data isolation');
})();

(function validatePublishedHeaderCompatibility() {
  assert(normalizer.includes('[._-]?(\\d+)'), 'Normalizer must accept the published dot-style item labels');
  assert(normalizer.includes("adapter: 'icar-sapa-scored-response-v2'"));
  assert(normalizer.includes('acceptsPublishedDotItemLabels: true'));
})();

(function validateBoundedRealAnalysis() {
  assert(analysis.includes("CIL_ICAR_IRT_MAX_N"), '2PL run must have an explicit reproducible cap');
  assert(analysis.includes("CIL_ICAR_FACTOR_MAX_N"), 'Factor run must have an explicit reproducible cap');
  assert(analysis.includes("fullDataUsedForReliability = TRUE"), 'Reliability must still use the full adult data');
  assert(analysis.includes("fullDataUsedForAgeDif = TRUE"), 'Age-DIF screen must still use the full adult data');
  assert(analysis.includes("mirt::mirt(domain_matrix_irt, 1, itemtype = '2PL'"), 'Real run must execute domain 2PL models');
  assert(analysis.includes('psych::tetrachoric'), 'Factor structure should attempt binary-item tetrachoric correlations');
  assert(analysis.includes("psych::fa(rho, nfactors = 4"), 'Real run must execute the four-factor structure screen');
  assert(analysis.includes('deltaMcFaddenPseudoR2'), 'Age-DIF output must include an effect-size diagnostic');
  assert(analysis.includes('productIqUnlocked = FALSE'));
})();

(function validateWorkflowIsolation() {
  assert(workflow.includes('feature/calibration-v8-first-real-icar-run'));
  assert(workflow.includes('workflow_dispatch:'));
  assert(workflow.includes('Rscript scripts/acquire-icar-sapa.R "$RUNNER_TEMP/icar/icar-sapa-source.csv"'));
  assert(workflow.includes('--run-r'));
  assert(workflow.includes('Build aggregate-only research artifact'));
  assert(workflow.includes('test ! -f "$RUNNER_TEMP/icar/public-results/external-scored-responses.csv"'));
  assert(workflow.includes("grep -R -E 'icar-[0-9a-f]{20}'"), 'Artifact gate must reject participant-level pseudonymous keys');
  assert(workflow.includes('calibration-v8-real-icar-aggregate-results'));
  assert(!workflow.includes('path: ${{ runner.temp }}/icar/analysis'), 'Artifact upload must not include the participant-level analysis directory');
})();

(function validateGitIgnoreBoundary() {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert(/^calibration\/output\/$/m.test(gitignore));
})();

console.log('Calibration v8 real ICAR run validation PASS');
