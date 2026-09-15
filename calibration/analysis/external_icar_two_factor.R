#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  stop('Usage: Rscript calibration/analysis/external_icar_two_factor.R <external-scored-responses.csv> <output-dir>')
}

input_path <- args[[1]]
out_dir <- args[[2]]
manifest_path <- file.path(out_dir, 'icar-external-validation.json')

required_packages <- c('psych', 'jsonlite')
missing_packages <- required_packages[!vapply(required_packages, requireNamespace, quietly = TRUE, FUN.VALUE = logical(1))]
if (length(missing_packages) > 0) {
  stop(sprintf('Missing R packages: %s', paste(missing_packages, collapse = ', ')))
}
if (!file.exists(manifest_path)) stop('Two-factor interpretation requires the aggregate ICAR validation manifest.')

read_cap <- function(name, default) {
  value <- suppressWarnings(as.integer(Sys.getenv(name, as.character(default))))
  if (!is.finite(value) || value < 1000) default else value
}

factor_max_n <- read_cap('CIL_ICAR_FACTOR_MAX_N', 30000)
long <- read.csv(input_path, stringsAsFactors = FALSE, check.names = FALSE)
required_columns <- c('sourceKey','externalItemId','externalDomain','correct','productNormEligible','cilItem','productIqUnlocked','autoCpiToIq')
missing_columns <- setdiff(required_columns, names(long))
if (length(missing_columns) > 0) stop(sprintf('Missing columns: %s', paste(missing_columns, collapse = ', ')))

false_like <- function(x) !any(x %in% c(TRUE, 'true', 'TRUE', 1), na.rm = TRUE)
if (!false_like(long$productNormEligible)) stop('External data must remain productNormEligible=false.')
if (!false_like(long$cilItem)) stop('External ICAR rows must remain cilItem=false.')
if (!false_like(long$productIqUnlocked)) stop('External data must remain productIqUnlocked=false.')
if (!false_like(long$autoCpiToIq)) stop('External data must remain autoCpiToIq=false.')

long$correct <- as.numeric(long$correct)
long <- long[long$correct %in% c(0, 1), ]
long$externalDomain <- toupper(long$externalDomain)
domains <- c('LN','MR','VR','R3D')
items <- sort(unique(long$externalItemId))
participant_ids <- sort(unique(long$sourceKey))
if (length(items) != 60) stop(sprintf('Expected 60 ICAR items; got %d.', length(items)))

wide <- matrix(NA_real_, nrow = length(participant_ids), ncol = length(items), dimnames = list(participant_ids, items))
wide[cbind(match(long$sourceKey, participant_ids), match(long$externalItemId, items))] <- long$correct
response_count <- rowSums(!is.na(wide))
eligible <- response_count >= 8
factor_matrix <- wide[eligible, , drop = FALSE]
if (nrow(factor_matrix) > factor_max_n) factor_matrix <- factor_matrix[seq_len(factor_max_n), , drop = FALSE]
if (nrow(factor_matrix) < 1000) stop('Too few participants for two-factor interpretation.')

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
fit <- suppressWarnings(psych::fa(rho, nfactors = 2, n.obs = nrow(factor_matrix), fm = 'minres', rotate = 'oblimin'))
loadings <- as.matrix(unclass(fit$loadings))
if (nrow(loadings) != 60 || ncol(loadings) != 2) stop('Unexpected two-factor loading shape.')
colnames(loadings) <- c('F1','F2')

item_domain_lookup <- setNames(vapply(items, function(item) unique(long$externalDomain[long$externalItemId == item])[[1]], character(1)), items)
item_rows <- lapply(seq_len(nrow(loadings)), function(i) {
  values <- as.numeric(loadings[i, ])
  abs_values <- abs(values)
  primary_index <- which.max(abs_values)
  list(
    externalItemId = rownames(loadings)[[i]],
    externalDomain = item_domain_lookup[[rownames(loadings)[[i]]]],
    F1 = values[[1]],
    F2 = values[[2]],
    primaryFactor = paste0('F', primary_index),
    primaryAbsLoading = abs_values[[primary_index]],
    crossLoading30 = all(abs_values >= 0.30),
    weakPrimary30 = max(abs_values) < 0.30
  )
})

item_frame <- data.frame(
  externalItemId = vapply(item_rows, `[[`, character(1), 'externalItemId'),
  externalDomain = vapply(item_rows, `[[`, character(1), 'externalDomain'),
  F1 = vapply(item_rows, `[[`, numeric(1), 'F1'),
  F2 = vapply(item_rows, `[[`, numeric(1), 'F2'),
  primaryFactor = vapply(item_rows, `[[`, character(1), 'primaryFactor'),
  primaryAbsLoading = vapply(item_rows, `[[`, numeric(1), 'primaryAbsLoading'),
  crossLoading30 = vapply(item_rows, `[[`, logical(1), 'crossLoading30'),
  weakPrimary30 = vapply(item_rows, `[[`, logical(1), 'weakPrimary30'),
  stringsAsFactors = FALSE
)

domain_summary <- lapply(domains, function(domain) {
  frame <- item_frame[item_frame$externalDomain == domain, , drop = FALSE]
  list(
    externalDomain = domain,
    items = nrow(frame),
    primaryF1 = sum(frame$primaryFactor == 'F1'),
    primaryF2 = sum(frame$primaryFactor == 'F2'),
    meanAbsF1 = mean(abs(frame$F1)),
    meanAbsF2 = mean(abs(frame$F2)),
    medianPrimaryAbsLoading = median(frame$primaryAbsLoading),
    crossLoading30 = sum(frame$crossLoading30),
    weakPrimary30 = sum(frame$weakPrimary30)
  )
})

safe_num <- function(x) {
  if (is.null(x) || length(x) == 0) return(NA_real_)
  value <- suppressWarnings(as.numeric(x[[1]]))
  if (!is.finite(value)) NA_real_ else value
}
phi_value <- NA_real_
if (!is.null(fit$Phi) && all(dim(fit$Phi) == c(2,2))) phi_value <- safe_num(fit$Phi[1,2])

manifest <- jsonlite::read_json(manifest_path, simplifyVector = FALSE)
if (!identical(manifest$safety$productNormEligible, FALSE) ||
    !identical(manifest$safety$productIqUnlocked, FALSE) ||
    !identical(manifest$safety$autoCpiToIq, FALSE)) {
  stop('Aggregate safety locks changed before two-factor interpretation.')
}

manifest$twoFactorStructure <- list(
  status = 'provisional-external-structure-evidence',
  model = 'exploratory-2-factor-binary-correlation-minres-oblimin',
  correlationMethod = correlation_method,
  eligibleParticipants = sum(eligible),
  fitParticipants = nrow(factor_matrix),
  RMSEA = safe_num(fit$RMSEA),
  TLI = safe_num(fit$TLI),
  RMSR = safe_num(fit$rms),
  BIC = safe_num(fit$BIC),
  factorCorrelation = phi_value,
  domainSummary = domain_summary,
  itemLoadings = item_rows,
  namingPolicy = 'Do not assign semantic factor names from domain labels alone; interpret only after inspecting item/domain loading patterns.',
  interpretation = 'Parallel analysis supports a provisional two-factor solution in this external ICAR/SAPA sample. This is structural research evidence only and does not establish CIL product norms, IQ scores, or CPI-to-IQ conversion.'
)
manifest$limitations <- unique(c(
  unlist(manifest$limitations, use.names = FALSE),
  'The two-factor solution is exploratory and externally derived; semantic factor labels remain provisional until loading content is reviewed.'
))
jsonlite::write_json(manifest, manifest_path, pretty = TRUE, auto_unbox = TRUE, na = 'null')
cat(sprintf('Two-factor ICAR interpretation complete: %d fit participants, %d items.\n', nrow(factor_matrix), nrow(item_frame)))
cat('Product IQ norming and CPI-to-IQ conversion remain locked.\n')
