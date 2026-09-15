'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const acquire = fs.readFileSync(path.join(root, 'scripts', 'acquire-icar-sapa.R'), 'utf8');
const analysis = fs.readFileSync(path.join(root, 'calibration', 'analysis', 'external_icar_validation.R'), 'utf8');
const twoFactor = fs.readFileSync(path.join(root, 'calibration', 'analysis', 'external_icar_two_factor.R'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'scripts', 'run-external-dataset-research-pack.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'calibration-v8-real-icar-run.yml'), 'utf8');
const normalizer = fs.readFileSync(path.join(root, 'scripts', 'normalize-icar-sapa.js'), 'utf8');

(function validateSourceAndLicenseBoundary() {
  assert(acquire.includes('doi:10.7910/DVN/AD9RVY'), 'Real run must pin the published ICAR/SAPA DOI');
  assert(acquire.includes('dataverse.harvard.edu/api/access/dataset/:persistentId/'), 'Real run must use the Dataverse dataset API');
  assert(acquire.includes("item_pattern <- '^(LN|MR|VR|R3D)"), 'Acquisition must require ICAR item families');
  assert(acquire.includes("length(item_cols) == 60"), 'Acquisition must locate exactly 60 scored items');
  assert(acquire.includes('Raw third-party data remain in runner-local temporary storage'), 'Acquisition must document raw-data isolation');
})();

(function validatePublishedHeaderAndAgeCompatibility() {
  assert(normalizer.includes('const ITEM_RE = /^(LN|MR|VR|R3D)[._-]?'), 'Normalizer must accept punctuation between family and item number');
  assert(normalizer.includes("adapter: 'icar-sapa-scored-response-v3'"));
  assert(normalizer.includes('acceptsPublishedDotItemLabels: true'));
  assert(normalizer.includes("publishedAgeEncoding: 'categorical-bands'"), 'Normalizer must preserve published categorical age encoding');
  assert(normalizer.includes("EXCLUDED_AMBIGUOUS_SOURCE_AGE_BANDS = Object.freeze(['18andUnder', '60andOver'])"));
  assert(normalizer.includes('exactAgeImputed: false'), 'Normalizer must not invent exact ages from published bands');
  assert(!normalizer.includes('const age = Number(record[ageColumn])'), 'Normalizer must not coerce published categorical age bands into fake exact ages');
  assert(normalizer.includes('assertRealRunMinimums(normalized)'), 'Real normalizer must fail closed on implausibly small data');
})();

(function validateBoundedRealAnalysis() {
  assert(analysis.includes('CIL_ICAR_IRT_MAX_N'), '2PL run must have an explicit reproducible cap');
  assert(analysis.includes('CIL_ICAR_FACTOR_MAX_N'), 'Factor run must have an explicit reproducible cap');
  assert(analysis.includes('fullDataUsedForReliability = TRUE'), 'Reliability must still use the full included data');
  assert(analysis.includes('fullDataUsedForAgeDif = TRUE'), 'Age-DIF screen must still use the full included data');
  assert(analysis.includes("age_band_levels <- c('19–24','25–29','30–34','35–39','40–49','50–59')"), 'Age-DIF must use published-compatible source bands');
  assert(!analysis.includes('long$ageYears <-'), 'R analysis must not depend on imputed exact ages');
  assert(analysis.includes("mirt::mirt(domain_matrix_irt, 1, itemtype = '2PL'"), 'Real run must execute domain 2PL models');
  assert(analysis.includes('psych::tetrachoric'), 'Factor structure should attempt binary-item tetrachoric correlations');
  assert(analysis.includes('psych::fa(rho, nfactors = 4'), 'Real run must execute the four-factor structure screen');
  assert(analysis.includes('psych::fa.parallel'), 'Real run must execute bounded tetrachoric parallel analysis');
  assert(analysis.includes('firstTwentyEigenvalues'), 'Parallel-analysis evidence must preserve the first 20 observed eigenvalues');
  assert(analysis.includes('deltaMcFaddenPseudoR2'), 'Age-DIF output must include an effect-size diagnostic');
  assert(analysis.includes('productIqUnlocked = FALSE'));
  assert(analysis.includes('autoCpiToIq = FALSE'));
})();

(function validateTwoFactorInterpretation() {
  assert(runner.includes('external-icar-two-factor-interpretation'), 'Research pack must execute the two-factor interpretation after the main R validation');
  assert(runner.includes('calibration/analysis/external_icar_two_factor.R'));
  assert(twoFactor.includes("psych::fa(rho, nfactors = 2"), 'Two-factor interpretation must execute an explicit two-factor model');
  assert(twoFactor.includes("rotate = 'oblimin'"), 'Two-factor interpretation must allow correlated factors');
  assert(twoFactor.includes('manifest$twoFactorStructure'), 'Two-factor evidence must be merged into the aggregate validation manifest');
  assert(twoFactor.includes("namingPolicy = 'Do not assign semantic factor names"), 'Semantic factor names must not be guessed from domain labels');
  assert(twoFactor.includes("productNormEligible=false"), 'Two-factor interpretation must preserve the product-norm lock');
  assert(twoFactor.includes("Product IQ norming and CPI-to-IQ conversion remain locked"), 'Two-factor interpretation must document the locked governance state');
})();

(function validateWorkflowIsolation() {
  assert(workflow.includes('feature/calibration-v8-first-real-icar-run'));
  assert(workflow.includes('workflow_dispatch:'));
  assert(workflow.includes('Rscript scripts/acquire-icar-sapa.R "$RUNNER_TEMP/icar/icar-sapa-source.csv"'));
  assert(workflow.includes('includedAgeBandRows='), 'Workflow diagnostics should report aggregate included categorical-age rows');
  assert(workflow.includes('ageCoverage: manifest.ageCoverage'), 'Compact summary should preserve categorical age coverage');
  assert(workflow.includes('--run-r'));
  assert(workflow.includes('Build aggregate-only research artifact'));
  assert(workflow.includes('test ! -f "$RUNNER_TEMP/icar/public-results/external-scored-responses.csv"'));
  assert(workflow.includes("grep -R -E 'icar-[0-9a-f]{20}'"), 'Artifact gate must reject participant-level pseudonymous keys');
  assert(workflow.includes('calibration-v8-real-icar-aggregate-results'));
  const uploadsParticipantAnalysisDirectory = workflow
    .split('\n')
    .some((line) => /^\s*path:\s*\$\{\{ runner\.temp \}\}\/icar\/analysis(?:\/|\s*$)/.test(line));
  assert(!uploadsParticipantAnalysisDirectory, 'Artifact upload must not include the participant-level analysis directory');
})();

(function validateGitIgnoreBoundary() {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert(/^calibration\/output\/$/m.test(gitignore));
})();

console.log('Calibration v8 real ICAR run validation PASS');
