# Cognitive IQ Lab — Option & Item Quality Research

Status: Question Bank v3.2 option-quality pass

## Goal

Improve the 300-item original bank so an answer cannot often be guessed from formatting, scale, wording, or an obviously implausible distractor. This project studies public/open research and implementations, but does **not** import proprietary WAIS, Raven, Stanford–Binet, Pearson, or unclear-license test items.

## Sources studied

### Open Matrices Item Bank (OMIB)
- Koch, Spinath, Greiff & Becker (2022), *Development and Validation of the Open Matrices Item Bank*.
- https://www.mdpi.com/2079-3200/10/3/41
- OMIB reports 220 figural-matrix items and uses explicit construction rules such as addition, subtraction, disjunctive union, intersection, rotation and completeness.
- Key design lesson used here: difficulty should come from rule count / rule interaction, not from making wrong answers silly.
- OMIB also discusses construction-based responding as a way to reduce pure response-elimination strategies.
- We study the construction logic; no OMIB stimulus is copied into this bank.

### Automatic Item Generation for cognitive ability
- Ryoo et al. (2022), *Development of a New Measure of Cognitive Ability Using Automatic Item Generation and Its Psychometric Properties*.
- https://journals.sagepub.com/doi/10.1177/21582440221095016
- Key design lesson: generate a correct alternative and distractors from the same item model, where distractors represent plausible partial-rule errors.

### Computer-generated figural matrix psychometrics
- Freund, Hofer & Holling (2008), *Explaining and Controlling for the Psychometric Properties of Computer-Generated Figural Matrix Items*.
- https://journals.sagepub.com/doi/10.1177/0146621607306972
- Key design lesson: task parameters can be intentionally varied to control difficulty and reduce repetitive surface patterns.

### MaRs-IB / adaptive implementation
- MaRs-IB paper / later IRT work was reviewed for item-bank and adaptive-testing architecture.
- https://github.com/jakub-jedrusiak/mars-ib-cat
- The adaptive implementation is MIT, but its README notes the MaRs-IB stimuli have academic/non-commercial restrictions. Therefore Cognitive IQ Lab does not copy MaRs-IB stimuli.
- Useful engineering ideas: item-level discrimination/difficulty parameters, reliability-based stopping, randomesque selection, explicit timeout state.

### Open-source IQ test implementation
- https://github.com/8tp/iq-test (MIT)
- Studied as an engineering reference only.
- Useful design idea: wrong options should be near-misses that each violate a small part of the rule, rather than arbitrary unrelated answers; answer positions should not reveal a pattern.
- No question text or stimulus is copied.

### Distractor efficiency / item analysis
- Nonfunctional distractor analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC7372664/
- Functioning vs non-functioning distractors: https://pmc.ncbi.nlm.nih.gov/articles/PMC2713226/
- Recent distractor efficiency study: https://pmc.ncbi.nlm.nih.gov/articles/PMC11040895/
- Practical heuristic used in QA: a distractor chosen by fewer than ~5% of examinees after a reasonable sample is a possible non-functioning distractor and should be reviewed.
- Other important flaws to flag: option-length cues, formatting cues, logic/linguistic cues, irrelevant distractors, and correct answers that are uniquely specific or uniquely formatted.

## Changes adopted for QB v3.2

1. **Curated peer distractors for verbal analogies**
   - The original v3.1 analogy distractors were sampled from a broad answer pool and could be semantically unrelated.
   - v3.2 replaces those 20 analogy items with original stems whose four alternatives share a tighter semantic neighborhood.

2. **Single-error near-miss distractors for numeric reasoning**
   - Distractors model common partial-rule mistakes, e.g. forgetting one operation, using the wrong operand, applying the previous difference, or using a nearby percentage.
   - The wrong answers are intentionally close enough to require solving the rule.

3. **Symbol-matrix distractors stay in the same symbol family**
   - Wrong choices vary the relevant count rather than switching to an obviously unrelated shape.

4. **Answer-position balance remains auditable**
   - Correct-answer positions A/B/C/D are counted across the full bank and exposed in QA preflight.

5. **Static cue-risk checks**
   - Four unique options required.
   - Correct answer must use the same basic response format as the alternatives.
   - Strong answer-length outliers are flagged.
   - Symbol-family mismatches are flagged for symbol matrices.

## QA v2 metrics

The browser-local QA now tracks or derives:
- exposure count
- correct rate / empirical difficulty
- skip rate
- timeout rate
- average response time and response-time SD
- distractor selection frequency
- distractor efficiency
- item-rest correlation after sufficient local observations
- design-difficulty mismatch
- static option-cue risks
- A/B/C/D answer-position balance
- high-frequency repeated stem families

### Sample gates
- N < 10: accumulate only; avoid quality judgments.
- N >= 20: begin distractor-efficiency checks.
- N >= 30: begin item-rest discrimination checks.

These thresholds are engineering heuristics for local QA, not formal psychometric calibration standards.

## Important limitation

A good distractor engine and local item analysis improve engineering quality, but do not establish validity, reliability, population norms, IRT parameters, or a clinically meaningful IQ score. Those require multi-user response data, representative sampling, psychometric calibration, bias / invariance checks, and external validation.
