#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lordif)
  library(mirt)
  library(dplyr)
  library(readr)
  library(jsonlite)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
truth_file <- args[2] %||% "calibration/output/v12-confirmatory-true-domain-theta.csv"
item_truth_file <- args[3] %||% "calibration/output/v12-confirmatory-item-truth.json"
out <- args[4] %||% "calibration/output/v12-confirmatory-selected-method.json"

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
  if (length(other_items) != 6L) return(NULL)
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

method_summary <- function(rows) {
  df <- bind_rows(rows)
  if (!nrow(df)) stop("No selected-method target results")
  known <- df %>% filter(ageDif > 0)
  nulls <- df %>% filter(ageDif == 0)
  detected <- sum(known$difFlag %in% TRUE)
  false_pos <- sum(nulls$difFlag %in% TRUE)
  list(
    complete = all(df$complete %in% TRUE),
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
    maxAbsoluteAgeBandMeanThetaBias = if (all(is.na(df$maxAbsoluteAgeBandMeanThetaBias))) NA_real_ else max(df$maxAbsoluteAgeBandMeanThetaBias, na.rm = TRUE)
  )
}

raw <- independent_sessions(read_calibration(input))
age <- participant_age_table(raw)
truth <- read_csv(truth_file, show_col_types = FALSE)
item_truth <- fromJSON(item_truth_file, simplifyDataFrame = TRUE)
if (!all(c("itemId", "domain", "ageDif") %in% names(item_truth))) stop("item truth must contain itemId, domain, ageDif")

wide_all <- response_matrix(raw, NULL, min_item_n = 100)
dat_all <- wide_all %>% inner_join(age, by = "sourceKey")
if (nrow(dat_all) != 1200L) stop("v12 confirmatory requires exactly 1200 participants")
all_item_ids <- setdiff(names(wide_all), "sourceKey")
if (length(all_item_ids) != 42L) stop("v12 confirmatory requires exactly 42 administered items")
resp_all <- as.data.frame(dat_all[, all_item_ids, drop = FALSE])
group_all <- droplevels(dat_all$ageBand)
if (nlevels(group_all) < 3) stop("v12 confirmatory requires at least three age bands")

rows_selected <- list()
for (domain_name in DOMAINS) {
  domain_items <- item_truth %>% filter(domain == domain_name, itemId %in% all_item_ids) %>% arrange(itemId)
  if (nrow(domain_items) != 7L) stop("Expected seven confirmatory items for domain: ", domain_name)
  domain_ids <- domain_items$itemId
  resp_domain <- as.data.frame(resp_all[, domain_ids, drop = FALSE])
  true_lookup <- tibble(sourceKey = dat_all$sourceKey) %>%
    left_join(truth %>% filter(domain == domain_name) %>% select(sourceKey, trueTheta), by = "sourceKey")
  true_theta <- finite_or_na(true_lookup$trueTheta)
  if (any(!is.finite(true_theta))) stop("Missing true theta for domain: ", domain_name)

  for (target_item in domain_ids) {
    truth_row <- domain_items %>% filter(itemId == target_item) %>% slice(1)
    loo_theta <- fit_domain_loo_theta(resp_domain, target_item)
    loo_fit <- if (is.null(loo_theta)) NULL else run_fixed_theta_dif(resp_domain, loo_theta, group_all, target_item)
    selected <- extract_target(loo_fit, domain_ids, target_item)
    rows_selected[[length(rows_selected) + 1]] <- tibble(
      domain = domain_name,
      itemId = target_item,
      ageDif = as.numeric(truth_row$ageDif[[1]]),
      complete = isTRUE(selected$complete) && !is.null(loo_theta),
      difFlag = selected$difFlag,
      pseudo13McFadden = selected$pseudo13McFadden,
      materialByMcFaddenR2 = selected$materialByMcFaddenR2,
      thetaTruthCorrelation = if (is.null(loo_theta)) NA_real_ else cor_safe(true_theta, loo_theta),
      thetaRmse = if (is.null(loo_theta)) NA_real_ else rmse_safe(true_theta, loo_theta),
      maxAbsoluteAgeBandMeanThetaBias = if (is.null(loo_theta)) NA_real_ else age_bias(group_all, true_theta, loo_theta)
    )
  }
}

report <- list(
  version = "CIL-V12-CONFIRMATORY-SELECTED-METHOD-2026.09.1",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  participants = nrow(resp_all),
  items = ncol(resp_all),
  selectedMethodId = "domain-loo-eap-fixed-theta",
  selectedMethod = method_summary(rows_selected),
  governance = list(
    confirmatory = TRUE,
    syntheticOnly = TRUE,
    containsRealParticipants = FALSE,
    productNormEligible = FALSE,
    productIqUnlocked = FALSE,
    autoCpiToIq = FALSE
  )
)

dir.create(dirname(out), recursive = TRUE, showWarnings = FALSE)
write_json(report, out, pretty = TRUE, auto_unbox = TRUE, na = "null")
cat("Wrote v12 confirmatory selected-method aggregate to", out, "\n")
