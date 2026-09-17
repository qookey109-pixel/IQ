#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lordif)
  library(dplyr)
  library(readr)
  library(jsonlite)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
truth_file <- args[2] %||% "calibration/output/v11-true-domain-theta.csv"
out <- args[3] %||% "calibration/output/v11-dif-true-theta-diagnostic.json"

raw <- independent_sessions(read_calibration(input))
age <- participant_age_table(raw)
truth <- read_csv(truth_file, show_col_types = FALSE)
domains <- sort(unique(raw$domain))
rows <- list()

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

for (domain_name in domains) {
  wide <- response_matrix(raw, domain_name, min_item_n = 100)
  if (nrow(wide) < 250 || ncol(wide) < 6) next

  domain_truth <- truth %>%
    filter(domain == domain_name) %>%
    select(sourceKey, trueTheta)
  dat <- wide %>%
    inner_join(age, by = "sourceKey") %>%
    inner_join(domain_truth, by = "sourceKey")
  group <- droplevels(dat$ageBand)
  if (nlevels(group) < 3) next

  response_names <- setdiff(names(wide), "sourceKey")
  resp <- as.data.frame(dat[, response_names, drop = FALSE])
  observed_share <- vapply(resp, function(x) mean(!is.na(x)), numeric(1))
  resp <- resp[, observed_share >= 0.5, drop = FALSE]
  if (ncol(resp) < 5) next

  person_share <- apply(resp, 1, function(x) mean(!is.na(x)))
  keep_people <- person_share >= 0.5
  resp <- resp[keep_people, , drop = FALSE]
  group <- droplevels(group[keep_people])
  theta <- finite_or_na(dat$trueTheta[keep_people])
  if (nrow(resp) < 200 || nlevels(group) < 3 || any(!is.finite(theta))) next

  fit <- tryCatch(
    rundif(
      item = colnames(resp),
      resp = resp,
      theta = theta,
      gr = group,
      criterion = "Chisqr",
      alpha = 0.01,
      beta.change = 0.1,
      pseudo.R2 = "McFadden",
      R2.change = 0.02,
      wt = NULL
    ),
    error = function(e) e
  )

  if (inherits(fit, "error")) {
    rows[[length(rows) + 1]] <- data.frame(
      domain = domain_name,
      itemId = NA_character_,
      statisticalFlag = NA,
      chi12P = NA_real_,
      chi13P = NA_real_,
      chi23P = NA_real_,
      pseudo12McFadden = NA_real_,
      pseudo13McFadden = NA_real_,
      pseudo23McFadden = NA_real_,
      materialByMcFaddenR2 = NA,
      status = paste0("fit-error: ", conditionMessage(fit)),
      stringsAsFactors = FALSE
    )
    next
  }

  flags <- as.logical(fit$flag)
  if (length(flags) != ncol(resp)) flags <- rep(NA, ncol(resp))
  stats <- if (is.null(fit$stats)) NULL else as.data.frame(fit$stats, stringsAsFactors = FALSE)
  if (!is.null(stats) && nrow(stats) != ncol(resp)) stats <- NULL

  n_items <- ncol(resp)
  pseudo13 <- column_or_na(stats, "pseudo13.McFadden", n_items)
  rows[[length(rows) + 1]] <- data.frame(
    domain = domain_name,
    itemId = colnames(resp),
    statisticalFlag = flags,
    chi12P = column_or_na(stats, "chi12", n_items),
    chi13P = column_or_na(stats, "chi13", n_items),
    chi23P = column_or_na(stats, "chi23", n_items),
    pseudo12McFadden = column_or_na(stats, "pseudo12.McFadden", n_items),
    pseudo13McFadden = pseudo13,
    pseudo23McFadden = column_or_na(stats, "pseudo23.McFadden", n_items),
    materialByMcFaddenR2 = !is.na(pseudo13) & pseudo13 >= 0.02,
    status = if (is.null(stats)) "stats-unavailable" else "ok",
    stringsAsFactors = FALSE
  )
}

item_rows <- bind_rows(rows)
ok <- item_rows %>% filter(status == "ok", !is.na(itemId))
statistical <- ok %>% filter(statisticalFlag %in% TRUE)
material <- ok %>% filter(materialByMcFaddenR2 %in% TRUE)

report <- list(
  version = "CIL-V11-DIF-TRUE-THETA-DIAGNOSTIC-2026.09.1",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  analysis = "v11-post-failure-known-truth-conditioning-audit",
  conditioning = list(
    source = "synthetic generator true domain theta",
    estimatedFromResponses = FALSE,
    criterion = "Chisqr",
    alpha = 0.01,
    pseudoR2 = "McFadden",
    referenceR2Change = 0.02
  ),
  summary = list(
    analyzedItems = nrow(ok),
    statisticalFlags = nrow(statistical),
    materialByMcFaddenR2 = nrow(material),
    statisticalFlagRate = if (nrow(ok)) nrow(statistical) / nrow(ok) else NA_real_,
    materialByMcFaddenR2Rate = if (nrow(ok)) nrow(material) / nrow(ok) else NA_real_,
    extractionComplete = nrow(ok) == 42 && all(is.finite(ok$pseudo13McFadden))
  ),
  flaggedItems = lapply(which(ok$statisticalFlag %in% TRUE), function(i) {
    row <- ok[i, ]
    list(
      itemId = row$itemId[[1]],
      domain = row$domain[[1]],
      chi12P = row$chi12P[[1]],
      chi13P = row$chi13P[[1]],
      chi23P = row$chi23P[[1]],
      pseudo12McFadden = row$pseudo12McFadden[[1]],
      pseudo13McFadden = row$pseudo13McFadden[[1]],
      pseudo23McFadden = row$pseudo23McFadden[[1]],
      materialByMcFaddenR2 = isTRUE(row$materialByMcFaddenR2[[1]])
    )
  }),
  materialItems = lapply(which(ok$materialByMcFaddenR2 %in% TRUE), function(i) {
    row <- ok[i, ]
    list(
      itemId = row$itemId[[1]],
      domain = row$domain[[1]],
      statisticalFlag = isTRUE(row$statisticalFlag[[1]]),
      pseudo13McFadden = row$pseudo13McFadden[[1]]
    )
  }),
  governance = list(
    postFailureDiagnosticOnly = TRUE,
    changesConfirmatoryVerdict = FALSE,
    thresholdChangesAllowed = FALSE,
    productNormEligible = FALSE,
    productIqUnlocked = FALSE,
    autoCpiToIq = FALSE
  )
)

dir.create(dirname(out), recursive = TRUE, showWarnings = FALSE)
write_json(report, out, pretty = TRUE, auto_unbox = TRUE, na = "null")
cat("Wrote v11 true-theta DIF diagnostic to", out, "\n")
