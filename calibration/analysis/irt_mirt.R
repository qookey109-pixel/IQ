#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(mirt)
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
domains <- sort(unique(raw$domain))
summary_rows <- list()
parameter_rows <- list()
theta_rows <- list()

for (domain_name in domains) {
  wide <- response_matrix(raw, domain_name, min_item_n = 100)
  if (nrow(wide) < 200 || ncol(wide) < 6) {
    summary_rows[[length(summary_rows) + 1]] <- tibble(
      domain = domain_name,
      status = "insufficient-data",
      participants = nrow(wide),
      items = max(0, ncol(wide) - 1)
    )
    next
  }

  ids <- wide$sourceKey
  dat <- as.data.frame(wide[, -1, drop = FALSE])
  keep <- vapply(dat, function(x) {
    z <- x[!is.na(x)]
    length(z) >= 100 && length(unique(z)) > 1
  }, logical(1))
  dat <- dat[, keep, drop = FALSE]

  if (ncol(dat) < 5) {
    summary_rows[[length(summary_rows) + 1]] <- tibble(
      domain = domain_name,
      status = "insufficient-variable-items",
      participants = nrow(dat),
      items = ncol(dat)
    )
    next
  }

  fit <- tryCatch(
    mirt(dat, 1, itemtype = "2PL", technical = list(NCYCLES = 1000), verbose = FALSE),
    error = function(e) e
  )

  if (inherits(fit, "error")) {
    summary_rows[[length(summary_rows) + 1]] <- tibble(
      domain = domain_name,
      status = paste0("fit-error: ", conditionMessage(fit)),
      participants = nrow(dat),
      items = ncol(dat)
    )
    next
  }

  pars <- coef(fit, IRTpars = TRUE, simplify = TRUE)$items
  pars_df <- as.data.frame(pars)
  pars_df$itemId <- rownames(pars_df)
  pars_df$domain <- domain_name
  parameter_rows[[length(parameter_rows) + 1]] <- as_tibble(pars_df)

  theta <- fscores(fit, method = "EAP", full.scores.SE = TRUE)
  theta_df <- as.data.frame(theta)
  theta_df$sourceKey <- ids
  theta_df$domain <- domain_name
  theta_rows[[length(theta_rows) + 1]] <- as_tibble(theta_df)

  summary_rows[[length(summary_rows) + 1]] <- tibble(
    domain = domain_name,
    status = "ok",
    participants = nrow(dat),
    items = ncol(dat),
    logLik = as.numeric(logLik(fit)),
    AIC = AIC(fit),
    BIC = BIC(fit)
  )
}

summary_df <- bind_rows(summary_rows)
params_df <- bind_rows(parameter_rows)
theta_df <- bind_rows(theta_rows)

write_csv(summary_df, file.path(out_dir, "irt-domain-summary.csv"), na = "")
write_csv(params_df, file.path(out_dir, "item-parameters.csv"), na = "")
write_csv(theta_df, file.path(out_dir, "participant-domain-theta.csv"), na = "")

message("Wrote domain IRT summary, item parameters, and participant domain theta scores to ", out_dir)
message("These are calibration research outputs only; they do not unlock IQ reporting by themselves.")
