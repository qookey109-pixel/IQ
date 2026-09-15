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
long$externalDomain <- toupper(long$externalDomain)
domains <- c('LN','MR','VR','R3D')

participants <- unique(long[, c('sourceKey','ageYears','ageBand')])
items <- sort(unique(long$externalItemId))
participant_ids <- sort(unique(long$sourceKey))
wide <- matrix(NA_real_, nrow = length(participant_ids), ncol = length(items),
               dimnames = list(participant_ids, items))
for (i in seq_len(nrow(long))) {
  wide[long$sourceKey[[i]], long$externalItemId[[i]]] <- long$correct[[i]]
}

reliability <- list()
item_parameter_rows <- list()
for (domain in domains) {
  domain_items <- sort(unique(long$externalItemId[long$externalDomain == domain]))
  domain_matrix <- wide[, domain_items, drop = FALSE]
  keep_rows <- rowSums(!is.na(domain_matrix)) >= 2
  domain_matrix_fit <- domain_matrix[keep_rows, , drop = FALSE]

  alpha_value <- NA_real_
  omega_total <- NA_real_
  if (nrow(domain_matrix_fit) >= 50 && ncol(domain_matrix_fit) >= 3) {
    alpha_result <- suppressWarnings(psych::alpha(domain_matrix_fit, check.keys = FALSE, warnings = FALSE, na.rm = TRUE))
    alpha_value <- unname(alpha_result$total$raw_alpha)
    omega_result <- tryCatch(
      suppressWarnings(psych::omega(domain_matrix_fit, nfactors = 1, plot = FALSE, warnings = FALSE)),
      error = function(e) NULL
    )
    if (!is.null(omega_result) && !is.null(omega_result$omega.tot)) omega_total <- unname(omega_result$omega.tot)
  }

  reliability[[domain]] <- list(
    items = length(domain_items),
    participantsWithAtLeastTwoResponses = sum(keep_rows),
    alpha = alpha_value,
    omegaTotal = omega_total
  )

  if (nrow(domain_matrix_fit) >= 500 && ncol(domain_matrix_fit) >= 3) {
    fit <- tryCatch(
      mirt::mirt(domain_matrix_fit, 1, itemtype = '2PL', verbose = FALSE, technical = list(NCYCLES = 500)),
      error = function(e) NULL
    )
    if (!is.null(fit)) {
      coefs <- mirt::coef(fit, IRTpars = TRUE, simplify = TRUE)$items
      frame <- data.frame(
        externalItemId = rownames(coefs),
        externalDomain = domain,
        discriminationA = coefs[, 'a'],
        difficultyB = coefs[, 'b'],
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
  rest_score <- rowMeans(wide[, other_items, drop = FALSE], na.rm = TRUE)
  rest_score[!is.finite(rest_score)] <- NA_real_
  age_band <- factor(age_lookup[rownames(wide)], levels = c('18–24','25–34','35–44','45–54','55–65'))
  frame <- data.frame(y = y, restScore = rest_score, ageBand = age_band)
  frame <- frame[complete.cases(frame), ]
  if (nrow(frame) < 500 || length(unique(frame$y)) < 2 || length(unique(frame$ageBand)) < 3) next

  result <- tryCatch({
    null_model <- glm(y ~ restScore, data = frame, family = binomial())
    age_model <- glm(y ~ restScore + ageBand, data = frame, family = binomial())
    ll0 <- as.numeric(logLik(null_model))
    ll1 <- as.numeric(logLik(age_model))
    df_diff <- attr(logLik(age_model), 'df') - attr(logLik(null_model), 'df')
    lr <- max(0, 2 * (ll1 - ll0))
    p <- pchisq(lr, df = df_diff, lower.tail = FALSE)
    data.frame(
      externalItemId = item,
      externalDomain = item_domain,
      n = nrow(frame),
      likelihoodRatio = lr,
      df = df_diff,
      p = p,
      stringsAsFactors = FALSE
    )
  }, warning = function(w) NULL, error = function(e) NULL)
  if (!is.null(result)) dif_rows[[length(dif_rows) + 1]] <- result
}

age_dif <- if (length(dif_rows)) do.call(rbind, dif_rows) else data.frame()
if (nrow(age_dif)) {
  age_dif$pAdjustedBH <- p.adjust(age_dif$p, method = 'BH')
  age_dif$flag <- age_dif$pAdjustedBH < 0.01
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

factor_fit <- NULL
if (nrow(wide) >= 1000 && ncol(wide) == 60) {
  factor_fit <- tryCatch({
    fit4 <- mirt::mirt(wide, 4, itemtype = '2PL', method = 'MHRM', verbose = FALSE, technical = list(NCYCLES = 800))
    stats <- mirt::M2(fit4, calcNull = TRUE)
    list(
      model = 'exploratory-4-factor-2PL',
      M2 = unname(stats$M2),
      df = unname(stats$df),
      p = unname(stats$p),
      RMSEA = unname(stats$RMSEA),
      SRMSR = unname(stats$SRMSR),
      TLI = unname(stats$TLI),
      CFI = unname(stats$CFI)
    )
  }, error = function(e) list(model = 'exploratory-4-factor-2PL', error = conditionMessage(e)))
}

manifest <- list(
  version = 'CIL-EXTERNAL-ICAR-VALIDATION-2026.09.2',
  generatedAt = format(Sys.time(), tz = 'UTC', usetz = TRUE),
  datasetId = 'icar-sapa-2010-2013',
  participants = length(participant_ids),
  scoredRows = nrow(long),
  items = length(items),
  ageRange = range(participants$ageYears, na.rm = TRUE),
  reliability = reliability,
  ageDifScreen = list(
    method = 'logistic-regression-rest-score-plus-age-band',
    testedItems = nrow(age_dif),
    flaggedItemsBH001 = if (nrow(age_dif)) sum(age_dif$flag, na.rm = TRUE) else 0,
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
    'Age-DIF output is a logistic regression screen, not a CIL product fairness verdict.',
    'External results validate methods and structure only.'
  )
)
jsonlite::write_json(manifest, file.path(out_dir, 'icar-external-validation.json'), pretty = TRUE, auto_unbox = TRUE, na = 'null')
cat(sprintf('ICAR external validation complete: %d participants, %d scored rows, %d items.\n', length(participant_ids), nrow(long), length(items)))
cat('External data remain isolated from Cognitive IQ Lab product norms.\n')
