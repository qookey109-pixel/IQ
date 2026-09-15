#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lordif)
  library(dplyr)
  library(readr)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
out_dir <- args[2] %||% "calibration/output"
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

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

  # lordif performs iterative logistic-regression DIF detection. Missing-by-design
  # data are filtered conservatively above; flagged output is a REVIEW signal,
  # never an automatic item deletion.
  fit <- tryCatch(
    lordif(resp, group, criterion = "Chisqr", alpha = 0.01, pseudo.R2 = "McFadden"),
    error = function(e) e
  )

  if (inherits(fit, "error")) {
    rows[[length(rows) + 1]] <- tibble(
      domain = domain_name,
      itemId = NA_character_,
      difFlag = NA,
      difDeltaR2 = NA_real_,
      status = paste0("fit-error: ", conditionMessage(fit))
    )
    next
  }

  flags <- fit$flag
  if (is.null(flags)) flags <- rep(FALSE, ncol(resp))
  if (is.matrix(flags) || is.data.frame(flags)) flags <- apply(flags, 1, any)
  flags <- as.logical(flags)
  if (length(flags) != ncol(resp)) flags <- rep(NA, ncol(resp))

  delta <- rep(NA_real_, ncol(resp))
  if (!is.null(fit$pseudo.R2)) {
    pr2 <- as.matrix(fit$pseudo.R2)
    if (nrow(pr2) == ncol(resp)) {
      numeric_cols <- which(vapply(as.data.frame(pr2), is.numeric, logical(1)))
      if (length(numeric_cols)) delta <- apply(pr2[, numeric_cols, drop = FALSE], 1, max, na.rm = TRUE)
    }
  }

  rows[[length(rows) + 1]] <- tibble(
    domain = domain_name,
    itemId = colnames(resp),
    difFlag = flags,
    difDeltaR2 = delta,
    status = "ok"
  )
}

out <- bind_rows(rows)
write_csv(out, file.path(out_dir, "age-dif.csv"), na = "")
message("Wrote age DIF review signals to ", file.path(out_dir, "age-dif.csv"))
message("DIF flags require substantive review and replication; they do not auto-rewrite or auto-retire items.")
