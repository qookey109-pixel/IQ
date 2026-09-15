#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  stop('Usage: Rscript calibration/analysis/external_icar_validation.R <external-scored-responses.csv> <output-dir>')
}

input_path <- args[[1]]
out_dir <- args[[2]]
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

required_packages <- c('psych', 'mirt', 'jsonlite')
missing_packages <- required_packages[!vapply(required_packages, requireNamespace, quietly = TRUE, FUN.VALUE = logical(1))]
if (length(missing_packages) > 0) {
  stop(sprintf('Missing R packages: %s', paste(missing_packages, collapse = ', ')))
}

read_cap <- function(name, default) {
  value <- suppressWarnings(as.integer(Sys.getenv(name, as.character(default))))
  if (!is.finite(value) || value < 1000) default else value
}

irt_max_n <- read_cap('CIL_ICAR_IRT_MAX_N', 20000)
factor_max_n <- read_cap('CIL_ICAR_FACTOR_MAX_N', 30000)

long <- read.csv(input_path, stringsAsFactors = FALSE, check.names = FALSE)
required_columns <- c('sourceKey','ageYears','ageBand','externalItemId','externalDomain','correct','productNormEligible','cilItem')
missing_columns <- setdiff(required_columns, names(long))
if (length(missing_columns) > 0) {
  stop(sprintf('Missing columns: %s', paste(missing_columns, collapse = ', ')))
}

if (any(long$productNormEligible %in% c(TRUE, 'true', 'TRUE', 1), na.rm = TRUE)) {
  stop('External data must remain productNormEligible=false.')
}
if (any(long$cilItem %in% c(TRUE, 'true', 'TRUE', 1), na.rm = TRUE)) {
  stop('External ICAR rows must remain cilItem=false.')
}

long$correct <- as.numeric(long$correct)
long <- long[long$correct %in% c(0, 1), ]
long$ageYears <- as.integer(long$ageYears)
long$externalDomain <- toupper(long$externalDomain)
domains <- c('LN','MR','VR','R3D')

participants <- unique(long[, c('sourceKey','ageYears','ageBand')])
items <- sort(unique(long$externalItemId))
participant_ids <- sort(unique(long$sourceKey))
wide <- matrix(NA_real_, nrow = length(participant_ids), ncol = length(items),
               dimnames = list(participant_ids, items))
row_index <- match(long$sourceKey, participant_ids)
col_index <- match(long$externalItemId, items)
wide[cbind(row_index, col_index)] <- long$correct

# sourceKey is a deterministic SHA-based pseudonym; lexical ordering therefore gives
# a deterministic pseudo-random cross-section without introducing a second identifier.
take_bounded <- function(matrix_data, max_n) {
  if (nrow(matrix_data) <= max_n) return(matrix_data)
  matrix_data[seq_len(max_n), , drop = FALSE]
}

safe_num <- function(x) {
  if (is.null(x) || length(x) == 0) return(NA_real_)
  value <- suppressWarnings(as.numeric(x[[1]]))
  if (!is.finite(value)) NA_real_ else value
}

reliability <- list()
item_parameter_rows <- list()
for (domain in domains) {
  domain_items <- sort(unique(long$externalItemId[long$externalDomain == domain]))
  domain_matrix <- wide[, domain_items, drop = FALSE]
  response_counts <- rowSums(!is.na(domain_matrix))
  reliability_rows <- response_counts >= 2
  domain_matrix_rel <- domain_matrix[reliability_rows, , drop = FALSE]

  alpha_value <- NA_real_
  omega_total <- NA_real_
  if (nrow(domain_matrix_rel) >= 50 && ncol(domain_matrix_rel) >= 3) {
    alpha_result <- tryCatch(
      suppressWarnings(psych::alpha(domain_matrix_rel, check.keys = FALSE, warnings = FALSE, na.rm = TRUE)),
      error = function(e) NULL
    )
    if (!is.null(alpha_result)) alpha_value <- safe_num(alpha_result$total$raw_alpha)
    omega_result <- tryCatch(
      suppressWarnings(psych::omega(domain_matrix_rel, nfactors = 1, plot = FALSE, warnings = FALSE)),
      error = function(e) NULL
    )
    if (!is.null(omega_result) && !is.null(omega_result$omega.tot)) omega_total <- safe_num(omega_result$omega.tot)
  }

  irt_rows <- response_counts >= 3
  domain_matrix_irt <- take_bounded(domain_matrix[irt_rows, , drop = FALSE], irt_max_n)
  reliability[[domain]] <- list(
    items = length(domain_items),
    participantsWithAtLeastTwoResponses = sum(reliability_rows),
    alpha = alpha_value,
    omegaTotal = omega_total,
    irtEligibleParticipants = sum(irt_rows),
    irtFitParticipants = nrow(domain_matrix_irt)
  )

  if (nrow(domain_matrix_irt) >= 500 && ncol(domain_matrix_irt) >= 3) {
    fit <- tryCatch(
      mirt::mirt(domain_matrix_irt, 1, itemtype = '2PL', verbose = FALSE, technical = list(NCYCLES = 500)),
      error = function(e) NULL
    )
    if (!is.null(fit)) {
      coefs <- mirt::coef(fit, IRTpars = TRUE, simplify = TRUE)$items
      frame <- data.frame(
        externalItemId = rownames(coefs),
        externalDomain = domain,
        discriminationA = coefs[, 'a'],
        difficultyB = coefs[, 'b'],
        irtFitParticipants = nrow(domain_matrix_irt),
        stringsAsFactors = FALSE
      )
      item_parameter_rows[[domain]] <- frame
    }
  }
}

item_parameters <- if (length(item_parameter_rows)) do.call(rbind, item_parameter_rows) else data.frame()
write.csv(item_parameters, file.path(out_dir, 'icar-item-parameters.csv'), row.names = FALSE, na = '')

# Logistic-regression age-DIF screen. This is an external method screen, not a CIL fairness verdict.
# For each item, compare response ~ rest-score against response ~ rest-score + age-band.
age_lookup <- setNames(participants$ageBand, participants$sourceKey)
dif_rows <- list()
for (item in items) {
  item_domain <- unique(long$externalDomain[long$externalItemId == item])[[1]]
  domain_items <- sort(unique(long$externalItemId[long$externalDomain == item_domain]))
  other_items <- setdiff(domain_items, item)
  if (length(other_items) < 2) next

  y <- wide[, item]
  other_matrix <- wide[, other_items, drop = FALSE]
  rest_count <- rowSums(!is.na(other_matrix))
  rest_score <- rowMeans(other_matrix, na.rm = TRUE)
  rest_score[!is.finite(rest_score) | rest_count < 2] <- NA_real_
  age_band <- factor(age_lookup[rownames(wide)], levels = c('18–24','25–34','35–44','45–54','55–65'))
  frame <- data.frame(y = y, restScore = rest_score, ageBand = age_band)
  frame <- frame[complete.cases(frame), ]
  if (nrow(frame) < 500 || length(unique(frame$y)) < 2 || length(unique(frame$ageBand)) < 3) next

  result <- tryCatch({
    null_model <- glm(y ~ restScore, data = frame, family = binomial())
    age_model <- glm(y ~ restScore + ageBand, data = frame, family = binomial())
    ll0_obj <- logLik(null_model)
    ll1_obj <- logLik(age_model)
    ll0 <- as.numeric(ll0_obj)
    ll1 <- as.numeric(ll1_obj)
    df_diff <- attr(ll1_obj, 'df') - attr(ll0_obj, 'df')
    lr <- max(0, 2 * (ll1 - ll0))
    p <- pchisq(lr, df = df_diff, lower.tail = FALSE)
    delta_pseudo_r2 <- if (is.finite(ll0) && ll0 != 0) max(0, (ll1 - ll0) / abs(ll0)) else NA_real_
    data.frame(
      externalItemId = item,
      externalDomain = item_domain,
      n = nrow(frame),
      likelihoodRatio = lr,
      df = df_diff,
      p = p,
      deltaMcFaddenPseudoR2 = delta_pseudo_r2,
      stringsAsFactors = FALSE
    )
  }, warning = function(w) NULL, error = function(e) NULL)
  if (!is.null(result)) dif_rows[[length(dif_rows) + 1]] <- result
}

age_dif <- if (length(dif_rows)) do.call(rbind, dif_rows) else data.frame()
if (nrow(age_dif)) {
  age_dif$pAdjustedBH <- p.adjust(age_dif$p, method = 'BH')
  age_dif$statisticalFlagBH001 <- age_dif$pAdjustedBH < 0.01
}
write.csv(age_dif, file.path(out_dir, 'icar-age-dif-screen.csv'), row.names = FALSE, na = '')

participant_scores <- aggregate(correct ~ sourceKey + externalDomain, data = long, FUN = mean)
participant_scores <- merge(participant_scores, participants, by = 'sourceKey', all.x = TRUE)
age_summary <- aggregate(correct ~ ageBand + externalDomain, data = participant_scores, FUN = function(x) c(n = length(x), mean = mean(x), sd = sd(x)))
age_rows <- data.frame(
  ageBand = age_summary$ageBand,
  externalDomain = age_summary$externalDomain,
  n = vapply(age_summary$correct, function(x) x[['n']], numeric(1)),
  meanProportionCorrect = vapply(age_summary$correct, function(x) x[['mean']], numeric(1)),
  sdProportionCorrect = vapply(age_summary$correct, function(x) x[['sd']], numeric(1)),
  stringsAsFactors = FALSE
)
write.csv(age_rows, file.path(out_dir, 'icar-age-band-summary.csv'), row.names = FALSE, na = '')

# Four-factor structure screen on binary-item correlations. This is deliberately
# bounded for CI reproducibility; full row-level summaries and DIF still use all
# available adult records. Tetrachoric correlations are attempted first, with a
# pairwise Pearson/phi fallback if sparse cells make tetrachorics fail.
response_count_all <- rowSums(!is.na(wide))
factor_eligible <- response_count_all >= 8
factor_matrix <- take_bounded(wide[factor_eligible, , drop = FALSE], factor_max_n)
factor_fit <- NULL
factor_loadings <- data.frame()
if (nrow(factor_matrix) >= 1000 && ncol(factor_matrix) == 60) {
  factor_fit <- tryCatch({
    correlation_method <- 'tetrachoric'
    rho <- tryCatch(
      suppressWarnings(psych::tetrachoric(factor_matrix, correct = 0.5)$rho),
      error = function(e) NULL
    )
    if (is.null(rho) || any(!is.finite(rho))) {
      correlation_method <- 'pairwise-pearson-phi-fallback'
      rho <- suppressWarnings(cor(factor_matrix, use = 'pairwise.complete.obs'))
    }
    rho <- psych::cor.smooth(rho)
    efa <- suppressWarnings(psych::fa(rho, nfactors = 4, n.obs = nrow(factor_matrix), fm = 'minres', rotate = 'oblimin'))
    loadings_matrix <- as.matrix(unclass(efa$loadings))
    factor_loadings <<- data.frame(
      externalItemId = rownames(loadings_matrix),
      loadings_matrix,
      check.names = FALSE,
      stringsAsFactors = FALSE
    )
    eigenvalues <- eigen(rho, symmetric = TRUE, only.values = TRUE)$values
    list(
      model = 'exploratory-4-factor-binary-correlation-minres-oblimin',
      correlationMethod = correlation_method,
      eligibleParticipants = sum(factor_eligible),
      fitParticipants = nrow(factor_matrix),
      RMSEA = safe_num(efa$RMSEA),
      TLI = safe_num(efa$TLI),
      RMSR = safe_num(efa$rms),
      BIC = safe_num(efa$BIC),
      firstEightEigenvalues = as.numeric(head(eigenvalues, 8))
    )
  }, error = function(e) list(
    model = 'exploratory-4-factor-binary-correlation-minres-oblimin',
    eligibleParticipants = sum(factor_eligible),
    fitParticipants = nrow(factor_matrix),
    error = conditionMessage(e)
  ))
}
write.csv(factor_loadings, file.path(out_dir, 'icar-factor-loadings.csv'), row.names = FALSE, na = '')

manifest <- list(
  version = 'CIL-EXTERNAL-ICAR-VALIDATION-2026.09.3',
  generatedAt = format(Sys.time(), tz = 'UTC', usetz = TRUE),
  datasetId = 'icar-sapa-2010-2013',
  participants = length(participant_ids),
  scoredRows = nrow(long),
  items = length(items),
  ageRange = range(participants$ageYears, na.rm = TRUE),
  analysisCaps = list(
    domain2plMaxParticipants = irt_max_n,
    factorMaxParticipants = factor_max_n,
    fullDataUsedForReliability = TRUE,
    fullDataUsedForAgeDif = TRUE,
    deterministicBoundedSubsamples = TRUE
  ),
  reliability = reliability,
  ageDifScreen = list(
    method = 'logistic-regression-rest-score-plus-age-band',
    minimumOtherDomainResponsesForRestScore = 2,
    testedItems = nrow(age_dif),
    statisticalFlagsBH001 = if (nrow(age_dif)) sum(age_dif$statisticalFlagBH001, na.rm = TRUE) else 0,
    interpretation = 'External method/fairness screen only; not a Cognitive IQ Lab item DIF result.'
  ),
  factorStructure = factor_fit,
  safety = list(
    sourceIsolated = TRUE,
    productNormEligible = FALSE,
    productIqUnlocked = FALSE,
    autoCpiToIq = FALSE,
    externalDataAreNotCilNorms = TRUE
  ),
  limitations = c(
    'Convenience sample; not representative population norms.',
    'English-language administration.',
    'Sparse missing-by-design SAPA administration.',
    'Domain 2PL and factor-structure models use deterministic bounded subsamples for reproducible CI runtime.',
    'Age-DIF output is a logistic regression screen, not a CIL product fairness verdict.',
    'External results validate methods and structure only.'
  )
)
jsonlite::write_json(manifest, file.path(out_dir, 'icar-external-validation.json'), pretty = TRUE, auto_unbox = TRUE, na = 'null')
cat(sprintf('ICAR external validation complete: %d participants, %d scored rows, %d items.\n', length(participant_ids), nrow(long), length(items)))
cat(sprintf('2PL cap/domain: %d; factor cap: %d.\n', irt_max_n, factor_max_n))
cat('External data remain isolated from Cognitive IQ Lab product norms.\n')
