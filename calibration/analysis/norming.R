#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(jsonlite)
})

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/output/participant-general-theta.csv"
score_col <- args[2] %||% "theta"
out_dir <- args[3] %||% "calibration/output"
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

x <- read_csv(input, show_col_types = FALSE, progress = FALSE)
required <- c("sourceKey", "ageYears", "ageBand", score_col)
missing <- setdiff(required, names(x))
if (length(missing)) stop("Missing columns: ", paste(missing, collapse = ", "))

# One score per pseudonymous participant. Repeated sessions must already have been
# resolved by the upstream calibration protocol.
x <- x %>%
  distinct(sourceKey, .keep_all = TRUE) %>%
  filter(ageYears >= 18, ageYears <= 65, is.finite(.data[[score_col]]))

norms <- x %>%
  group_by(ageBand) %>%
  summarise(
    n = n(),
    mean = mean(.data[[score_col]], na.rm = TRUE),
    sd = sd(.data[[score_col]], na.rm = TRUE),
    p02 = quantile(.data[[score_col]], 0.02, na.rm = TRUE),
    p05 = quantile(.data[[score_col]], 0.05, na.rm = TRUE),
    p10 = quantile(.data[[score_col]], 0.10, na.rm = TRUE),
    p25 = quantile(.data[[score_col]], 0.25, na.rm = TRUE),
    p50 = quantile(.data[[score_col]], 0.50, na.rm = TRUE),
    p75 = quantile(.data[[score_col]], 0.75, na.rm = TRUE),
    p90 = quantile(.data[[score_col]], 0.90, na.rm = TRUE),
    p95 = quantile(.data[[score_col]], 0.95, na.rm = TRUE),
    p98 = quantile(.data[[score_col]], 0.98, na.rm = TRUE),
    .groups = "drop"
  )

write_csv(norms, file.path(out_dir, "age-norm-table-research.csv"), na = "")

# A 100/15 standard-score transformation is only a research diagnostic here.
# The public product must not expose it until the full unlock criteria are met.
allow_standard_score <- identical(Sys.getenv("ALLOW_RESEARCH_STANDARD_SCORE"), "1")
if (allow_standard_score) {
  scored <- x %>%
    left_join(norms %>% select(ageBand, mean, sd), by = "ageBand") %>%
    mutate(
      z_age = if_else(is.finite(sd) & sd > 0, (.data[[score_col]] - mean) / sd, NA_real_),
      standardScore100_15_RESEARCH_ONLY = 100 + 15 * z_age
    )
  write_csv(scored, file.path(out_dir, "research-only-age-standard-scores.csv"), na = "")
}

manifest <- list(
  version = "1.0",
  analysis = "age-norming",
  scoreColumn = score_col,
  participants = nrow(x),
  ageBands = nrow(norms),
  standardScoreProduced = allow_standard_score,
  productIqUnlocked = FALSE,
  warning = "Research norm output is not a validated IQ score. Product iqEstimate must remain null until reliability, validity, DIF, linking, and representative age norms are approved."
)
write_json(manifest, file.path(out_dir, "norming-manifest.json"), pretty = TRUE, auto_unbox = TRUE)
message("Wrote research age norm table. Product IQ remains locked.")
