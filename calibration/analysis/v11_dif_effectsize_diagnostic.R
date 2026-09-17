#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lordif)
  library(dplyr)
  library(jsonlite)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
out <- args[2] %||% "calibration/output/v11-dif-effectsize-diagnostic.json"

analysis_seed_text <- Sys.getenv("CIL_ANALYSIS_SEED", unset = "")
if (nzchar(analysis_seed_text)) {
  analysis_seed <- suppressWarnings(as.integer(analysis_seed_text))
  if (is.na(analysis_seed) || analysis_seed < 1L) stop("CIL_ANALYSIS_SEED must be a positive integer")
  set.seed(analysis_seed)
}

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

raw <- independent_sessions(read_calibration(input))
age <- participant_age_table(raw)
domains <- sort(unique(raw$domain))
rows <- list()

for (domain_name in domains) {
  wide <- response_matrix(raw, domain_name, min_item_n = 100)
  if (nrow(wide) < 250 || ncol(wide) < 6) next

  dat <- wide %>% inner_join(age, by = "sourceKey")
  group <- droplevels(dat$ageBand)
  if (nlevels(group) < 3) next

  resp <- as.data.frame(dat[, setdiff(names(wide), "sourceKey"), drop = FALSE])
  observed_share <- vapply(resp, function(x) mean(!is.na(x)), numeric(1))
  resp <- resp[, observed_share >= 0.5, drop = FALSE]
  if (ncol(resp) < 5) next

  person_share <- apply(resp, 1, function(x) mean(!is.na(x)))
  keep_people <- person_share >= 0.5
  resp <- resp[keep_people, , drop = FALSE]
  group <- droplevels(group[keep_people])
  if (nrow(resp) < 200 || nlevels(group) < 3) next

  fit <- tryCatch(
    lordif(resp, group, criterion = "Chisqr", alpha = 0.01, pseudo.R2 = "McFadden"),
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

  flags <- fit$flag
  if (is.null(flags)) flags <- rep(FALSE, ncol(resp))
  if (is.matrix(flags) || is.data.frame(flags)) flags <- apply(flags, 1, any)
  flags <- as.logical(flags)
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
  version = "CIL-V11-DIF-EFFECTSIZE-DIAGNOSTIC-2026.09.1",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  analysis = "v11-post-failure-lordif-effect-size-audit",
  method = list(
    criterion = "Chisqr",
    alpha = 0.01,
    pseudoR2 = "McFadden",
    referenceR2Change = 0.02,
    statisticalFlagMeaning = "lordif likelihood-ratio chi-square criterion",
    referenceR2Meaning = "lordif pseudo13.McFadden change from model 1 to model 3"
  ),
  summary = list(
    analyzedItems = nrow(ok),
    statisticalFlags = nrow(statistical),
    materialByMcFaddenR2 = nrow(material),
    statisticalFlagRate = if (nrow(ok)) nrow(statistical) / nrow(ok) else NA_real_,
    materialByMcFaddenR2Rate = if (nrow(ok)) nrow(material) / nrow(ok) else NA_real_,
    statsExtractionComplete = nrow(ok) == 42 && all(is.finite(ok$pseudo13McFadden))
  ),
  items = lapply(seq_len(nrow(ok)), function(i) {
    row <- ok[i, ]
    list(
      itemId = row$itemId[[1]],
      domain = row$domain[[1]],
      statisticalFlag = isTRUE(row$statisticalFlag[[1]]),
      chi12P = row$chi12P[[1]],
      chi13P = row$chi13P[[1]],
      chi23P = row$chi23P[[1]],
      pseudo12McFadden = row$pseudo12McFadden[[1]],
      pseudo13McFadden = row$pseudo13McFadden[[1]],
      pseudo23McFadden = row$pseudo23McFadden[[1]],
      materialByMcFaddenR2 = isTRUE(row$materialByMcFaddenR2[[1]])
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
cat("Wrote v11 post-failure lordif effect-size diagnostic to", out, "\n")
