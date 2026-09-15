#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(psych)
  library(dplyr)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
out <- args[2] %||% "calibration/output/reliability.json"

raw <- independent_sessions(read_calibration(input))
domains <- sort(unique(raw$domain))
results <- list()

for (domain_name in domains) {
  wide <- response_matrix(raw, domain_name, min_item_n = 30)
  if (nrow(wide) < 50 || ncol(wide) < 5) {
    results[[domain_name]] <- list(status = "insufficient-data", participants = nrow(wide), items = max(0, ncol(wide) - 1))
    next
  }

  dat <- as.data.frame(wide[, -1, drop = FALSE])
  keep <- vapply(dat, function(x) {
    z <- x[!is.na(x)]
    length(z) >= 30 && length(unique(z)) > 1
  }, logical(1))
  dat <- dat[, keep, drop = FALSE]

  if (ncol(dat) < 5) {
    results[[domain_name]] <- list(status = "insufficient-variable-items", participants = nrow(dat), items = ncol(dat))
    next
  }

  alpha_fit <- suppressWarnings(psych::alpha(dat, check.keys = FALSE, warnings = FALSE))
  omega_fit <- tryCatch(
    suppressWarnings(psych::omega(dat, nfactors = 1, plot = FALSE, warnings = FALSE)),
    error = function(e) NULL
  )

  results[[domain_name]] <- list(
    status = "ok",
    participants = nrow(dat),
    items = ncol(dat),
    alphaRaw = unname(alpha_fit$total$raw_alpha),
    alphaStd = unname(alpha_fit$total$std.alpha),
    omegaTotal = if (is.null(omega_fit)) NULL else unname(omega_fit$omega.tot),
    omegaHierarchical = if (is.null(omega_fit)) NULL else unname(omega_fit$omega_h)
  )
}

report <- list(
  version = "1.0",
  analysis = "reliability",
  independenceRule = "first session per sourceKey",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  domains = results
)

write_json_report(report, out)
