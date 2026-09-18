#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lordif)
  library(mirt)
  library(dplyr)
  library(readr)
  library(jsonlite)
})
source("calibration/analysis/common.R")

\`%||%\` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
truth_file <- args[2] %||% "calibration/output/v12-true-domain-theta.csv"
item_truth_file <- args[3] %||% "calibration/output/v12-item-truth.json"
out <- args[4] %||% "calibration/output/v12-dif-matching-comparison.json"
targets_per_domain <- suppressWarnings(as.integer(args[5] %||% "7"))
if (is.na(targets_per_domain) || targets_per_domain < 1L || targets_per_domain > 7L) {
  stop("targets_per_domain must be an integer from 1 to 7")
}

analysis_seed_text <- Sys.getenv("CIL_ANALYSIS_SEED", unset = "")
if (nzchar(analysis_seed_text)) {
  analysis_seed <- suppressWarnings(as.integer(analysis_seed_text))
  if (is.na(analysis_seed) || analysis_seed < 1L) stop("CIL_ANALYSIS_SEED must be a positive integer")
  set.seed(analysis_seed)
}

DOMAINS <- c(
  "verbal-comprehension",
  "fluid-reasoning",
  "visual-spatial",
  "working-memory",
  "processing-speed",
  "quantitative-reasoning"
)

finite_or_na <- function(x) {
  value <- suppressWarnings(as.numeric(x))
  ifelse(is.finite(value), value, NA_real_)
}

column_or_na <- function(stats, name, n) {
  if (is.null(stats) || !(name %in% names(stats))) return(rep(NA_real_, n))
  values <- finite_or_na(stats[[name]])
  if (length(values) != n) return(rep(NA_real_, n))
  values
}

cor_safe <- function(a, b) {
  keep <- is.finite(a) & is.finite(b)
  if (sum(keep) < 3) return(NA_real_)
  suppressWarnings(cor(a[keep], b[keep]))
}

rmse_safe <- function(a, b) {
  keep <- is.finite(a) & is.finite(b)
  if (sum(keep) < 3) return(NA_real_)
  sqrt(mean((a[keep] - b[keep])^2))
}

age_bias <- function(group, truth, estimate) {
  keep <- is.finite(truth) & is.finite(estimate) & !is.na(group)
  if (sum(keep) < 10) return(NA_real_)
  truth <- truth[keep]
  estimate <- estimate[keep]
  group <- droplevels(group[keep])
  if (sd(truth) <= 0 || sd(estimate) <= 0) return(NA_real_)
  truth_z <- as.numeric(scale(truth))
  estimate_z <- as.numeric(scale(estimate))
  shifts <- tibble(group = as.character(group), delta = estimate_z - truth_z) %>%
    group_by(group) %>%
    summarize(meanBias = mean(delta), .groups = "drop")
  if (!nrow(shifts)) return(NA_real_)
  max(abs(shifts$meanBias))
}

extract_target <- function(fit, item_ids, target_item) {
  idx <- match(target_item, item_ids)
  if (is.null(fit) || is.na(idx)) {
    return(list(complete = FALSE, difFlag = NA, pseudo13McFadden = NA_real_, materialByMcFaddenR2 = NA))
  }
  stats <- if (is.null(fit$stats)) NULL else as.data.frame(fit$stats, stringsAsFactors = FALSE)
  if (is.null(stats) || nrow(stats) != length(item_ids)) {
    return(list(complete = FALSE, difFlag = NA, pseudo13McFadden = NA_real_, materialByMcFaddenR2 = NA))
  }
  flags <- as.logical(fit$flag)
  if (length(flags) != length(item_ids)) flags <- rep(NA, length(item_ids))
  pseudo <- column_or_na(stats, "pseudo13.McFadden", length(item_ids))[[idx]]
  list(
    complete = !is.na(flags[[idx]]) && is.finite(pseudo),
    difFlag = if (is.na(flags[[idx]])) NA else isTRUE(flags[[idx]]),
    pseudo13McFadden = pseudo,
    materialByMcFaddenR2 = if (is.finite(pseudo)) pseudo >= 0.02 else NA
  )
}

run_fixed_theta_dif <- function(resp_domain, theta, group, target_item) {
  item_ids <- colnames(resp_domain)
  if (!(target_item %in% item_ids) || length(theta) != nrow(resp_domain) || any(!is.finite(theta))) return(NULL)
  tryCatch(
    rundif(
      item = item_ids,
      resp = resp_domain,
      theta = theta,
      gr = group,
      criterion = "Chisqr",
      alpha = 0.01,
      beta.change = 0.1,
      pseudo.R2 = "McFadden",
      R2.change = 0.02,
      wt = NULL
    ),
    error = function(e) NULL
  )
}

fit_domain_loo_theta <- function(resp_domain, target_item) {
  other_items <- setdiff(colnames(resp_domain), target_item)
  if (length(other_items) < 5) return(NULL)
  fit <- tryCatch(
    mirt(
      as.data.frame(resp_domain[, other_items, drop = FALSE]),
      1,
      itemtype = "2PL",
      technical = list(NCYCLES = 1000),
      verbose = FALSE
    ),
    error = function(e) e
  )
  if (inherits(fit, "error")) return(NULL)
  score <- tryCatch(fscores(fit, method = "EAP"), error = function(e) e)
  if (inherits(score, "error")) return(NULL)
  theta <- finite_or_na(as.data.frame(score)[[1]])
  if (length(theta) != nrow(resp_domain) || any(!is.finite(theta))) return(NULL)
  theta
}

fit_crossfit_map_theta <- function(resp_all, item_domain, target_item, target_domain) {
  other_items <- setdiff(colnames(resp_all), target_item)
  if (length(other_items) < 30) return(NULL)
  domain_for_item <- item_domain[other_items]
  if (any(is.na(domain_for_item))) return(NULL)

  q <- matrix(
    0,
    nrow = length(other_items),
    ncol = length(DOMAINS),
    dimnames = list(other_items, paste0("F", seq_along(DOMAINS)))
  )
  for (i in seq_along(other_items)) {
    d <- match(domain_for_item[[i]], DOMAINS)
    if (is.na(d)) return(NULL)
    q[i, d] <- 1
  }
  cov_matrix <- matrix(TRUE, nrow = length(DOMAINS), ncol = length(DOMAINS))
  diag(cov_matrix) <- FALSE
  model <- tryCatch(mirt.model(q, COV = cov_matrix), error = function(e) e)
  if (inherits(model, "error")) return(NULL)

  fit <- tryCatch(
    mirt(
      as.data.frame(resp_all[, other_items, drop = FALSE]),
      model,
      itemtype = "2PL",
      method = "MHRM",
      technical = list(NCYCLES = 1000),
      verbose = FALSE
    ),
    error = function(e) e
  )
  if (inherits(fit, "error")) return(NULL)

  score <- tryCatch(fscores(fit, method = "MAP"), error = function(e) e)
  if (inherits(score, "error")) return(NULL)
  score_df <- as.data.frame(score)
  factor_name <- paste0("F", match(target_domain, DOMAINS))
  if (!(factor_name %in% names(score_df))) return(NULL)
  theta <- finite_or_na(score_df[[factor_name]])
  if (length(theta) != nrow(resp_all) || any(!is.finite(theta))) return(NULL)
  theta
}

select_targets <- function(domain_truth, n) {
  domain_truth <- domain_truth %>% arrange(desc(ageDif > 0), itemId)
  head(domain_truth$itemId, n)
}

method_summary <- function(rows) {
  if (!length(rows)) {
    return(list(
      complete = FALSE,
      targetCount = 0L,
      knownDifControlsObserved = 0L,
      knownDifControlsDetected = 0L,
      nullDifItemsObserved = 0L,
      nullDifItemsFlagged = 0L,
      difSensitivity = NA_real_,
      difFalsePositiveRate = NA_real_,
      materialFlagRate = NA_real_,
      meanThetaTruthCorrelation = NA_real_,
      meanThetaRmse = NA_real_,
      maxAbsoluteAgeBandMeanThetaBias = NA_real_,
      targets = list()
    ))
  }
  df <- bind_rows(rows)
  complete <- all(df$complete %in% TRUE)
  known <- df %>% filter(ageDif > 0)
  nulls <- df %>% filter(ageDif == 0)
  detected <- sum(known$difFlag %in% TRUE)
  false_pos <- sum(nulls$difFlag %in% TRUE)
  list(
    complete = complete,
    targetCount = nrow(df),
    knownDifControlsObserved = nrow(known),
    knownDifControlsDetected = detected,
    nullDifItemsObserved = nrow(nulls),
    nullDifItemsFlagged = false_pos,
    difSensitivity = if (nrow(known)) detected / nrow(known) else NA_real_,
    difFalsePositiveRate = if (nrow(nulls)) false_pos / nrow(nulls) else NA_real_,
    materialFlagRate = mean(df$materialByMcFaddenR2 %in% TRUE),
    meanThetaTruthCorrelation = if (all(is.na(df$thetaTruthCorrelation))) NA_real_ else mean(df$thetaTruthCorrelation, na.rm = TRUE),
    meanThetaRmse = if (all(is.na(df$thetaRmse))) NA_real_ else mean(df$thetaRmse, na.rm = TRUE),
    maxAbsoluteAgeBandMeanThetaBias = if (all(is.na(df$maxAbsoluteAgeBandMeanThetaBias))) NA_real_ else max(df$maxAbsoluteAgeBandMeanThetaBias, na.rm = TRUE),
    targets = lapply(seq_len(nrow(df)), function(i) as.list(df[i, , drop = FALSE]))
  )
}

raw <- independent_sessions(read_calibration(input))
age <- participant_age_table(raw)
truth <- read_csv(truth_file, show_col_types = FALSE)
item_truth <- fromJSON(item_truth_file, simplifyDataFrame = TRUE)
if (!all(c("itemId", "domain", "ageDif") %in% names(item_truth))) stop("item truth must contain itemId, domain, ageDif")

wide_all <- response_matrix(raw, NULL, min_item_n = 100)
dat_all <- wide_all %>% inner_join(age, by = "sourceKey")
if (nrow(dat_all) < 200) stop("v12 comparison requires at least 200 participants")
all_item_ids <- setdiff(names(wide_all), "sourceKey")
resp_all <- as.data.frame(dat_all[, all_item_ids, drop = FALSE])
group_all <- droplevels(dat_all$ageBand)
if (nlevels(group_all) < 3) stop("v12 comparison requires at least three age bands")

item_domain <- setNames(as.character(item_truth$domain), item_truth$itemId)
if (any(is.na(item_domain[all_item_ids]))) stop("item truth does not cover all response items")

rows_baseline <- list()
rows_loo <- list()
rows_crossfit <- list()

for (domain_name in DOMAINS) {
  domain_items <- item_truth %>% filter(domain == domain_name, itemId %in% all_item_ids) %>% arrange(itemId)
  if (nrow(domain_items) < 7) stop("Expected seven v12 items for domain: ", domain_name)
  domain_ids <- domain_items$itemId
  resp_domain <- as.data.frame(resp_all[, domain_ids, drop = FALSE])
  targets <- select_targets(domain_items, targets_per_domain)

  true_lookup <- tibble(sourceKey = dat_all$sourceKey) %>%
    left_join(truth %>% filter(domain == domain_name) %>% select(sourceKey, trueTheta), by = "sourceKey")
  true_theta <- finite_or_na(true_lookup$trueTheta)
  if (any(!is.finite(true_theta))) stop("Missing true theta for domain: ", domain_name)

  baseline_fit <- tryCatch(
    lordif(resp_domain, group_all, criterion = "Chisqr", alpha = 0.01, pseudo.R2 = "McFadden"),
    error = function(e) NULL
  )

  for (target_item in targets) {
    truth_row <- domain_items %>% filter(itemId == target_item) %>% slice(1)
    base <- extract_target(baseline_fit, domain_ids, target_item)
    rows_baseline[[length(rows_baseline) + 1]] <- tibble(
      method = "lordif-iterative-current",
      domain = domain_name,
      itemId = target_item,
      ageDif = as.numeric(truth_row$ageDif[[1]]),
      complete = isTRUE(base$complete),
      difFlag = base$difFlag,
      pseudo13McFadden = base$pseudo13McFadden,
      materialByMcFaddenR2 = base$materialByMcFaddenR2,
      thetaTruthCorrelation = NA_real_,
      thetaRmse = NA_real_,
      maxAbsoluteAgeBandMeanThetaBias = NA_real_
    )

    loo_theta <- fit_domain_loo_theta(resp_domain, target_item)
    loo_fit <- if (is.null(loo_theta)) NULL else run_fixed_theta_dif(resp_domain, loo_theta, group_all, target_item)
    loo <- extract_target(loo_fit, domain_ids, target_item)
    rows_loo[[length(rows_loo) + 1]] <- tibble(
      method = "domain-loo-eap-fixed-theta",
      domain = domain_name,
      itemId = target_item,
      ageDif = as.numeric(truth_row$ageDif[[1]]),
      complete = isTRUE(loo$complete) && !is.null(loo_theta),
      difFlag = loo$difFlag,
      pseudo13McFadden = loo$pseudo13McFadden,
      materialByMcFaddenR2 = loo$materialByMcFaddenR2,
      thetaTruthCorrelation = if (is.null(loo_theta)) NA_real_ else cor_safe(true_theta, loo_theta),
      thetaRmse = if (is.null(loo_theta)) NA_real_ else rmse_safe(true_theta, loo_theta),
      maxAbsoluteAgeBandMeanThetaBias = if (is.null(loo_theta)) NA_real_ else age_bias(group_all, true_theta, loo_theta)
    )

    map_theta <- fit_crossfit_map_theta(resp_all, item_domain, target_item, domain_name)
    map_fit <- if (is.null(map_theta)) NULL else run_fixed_theta_dif(resp_domain, map_theta, group_all, target_item)
    map_result <- extract_target(map_fit, domain_ids, target_item)
    rows_crossfit[[length(rows_crossfit) + 1]] <- tibble(
      method = "crossfit-six-factor-map-fixed-theta",
      domain = domain_name,
      itemId = target_item,
      ageDif = as.numeric(truth_row$ageDif[[1]]),
      complete = isTRUE(map_result$complete) && !is.null(map_theta),
      difFlag = map_result$difFlag,
      pseudo13McFadden = map_result$pseudo13McFadden,
      materialByMcFaddenR2 = map_result$materialByMcFaddenR2,
      thetaTruthCorrelation = if (is.null(map_theta)) NA_real_ else cor_safe(true_theta, map_theta),
      thetaRmse = if (is.null(map_theta)) NA_real_ else rmse_safe(true_theta, map_theta),
      maxAbsoluteAgeBandMeanThetaBias = if (is.null(map_theta)) NA_real_ else age_bias(group_all, true_theta, map_theta)
    )
  }
}

methods <- list(
  "lordif-iterative-current" = method_summary(rows_baseline),
  "domain-loo-eap-fixed-theta" = method_summary(rows_loo),
  "crossfit-six-factor-map-fixed-theta" = method_summary(rows_crossfit)
)

candidate_complete <- isTRUE(methods[["domain-loo-eap-fixed-theta"]]$complete) &&
  isTRUE(methods[["crossfit-six-factor-map-fixed-theta"]]$complete)

report <- list(
  version = "CIL-V12-DIF-MATCHING-DEVELOPMENT-2026.09.1",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  participants = nrow(resp_all),
  items = ncol(resp_all),
  targetsPerDomain = targets_per_domain,
  candidateComplete = candidate_complete,
  methods = methods,
  governance = list(
    developmentOnly = TRUE,
    confirmatorySeedsUsed = FALSE,
    syntheticOnly = TRUE,
    containsRealParticipants = FALSE,
    productNormEligible = FALSE,
    productIqUnlocked = FALSE,
    autoCpiToIq = FALSE
  )
)

dir.create(dirname(out), recursive = TRUE, showWarnings = FALSE)
write_json(report, out, pretty = TRUE, auto_unbox = TRUE, na = "null")
cat("Wrote v12 DIF matching development comparison to", out, "\n")
