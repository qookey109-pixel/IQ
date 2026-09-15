#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(jsonlite)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || length(x) == 0 || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
out_dir <- args[2] %||% "calibration/output"
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

raw <- independent_sessions(read_calibration(input))
if (!"formId" %in% names(raw)) stop("formId column is required for matrix coverage analysis")

matrix_rows <- raw %>%
  filter(grepl("^matrix:CIL-MATRIX-2026\\.09\\.1:epoch-[0-9]+:slot-[0-9]{2}$", formId %||% "")) %>%
  mutate(
    matrixEpoch = as.integer(sub(".*:epoch-([0-9]+):slot-.*", "\\1", formId)),
    matrixSlot = as.integer(sub(".*:slot-([0-9]{2})$", "\\1", formId))
  )

if (!nrow(matrix_rows)) {
  write_json(list(
    version = "1.0",
    analysis = "matrix-coverage",
    matrixVersion = "CIL-MATRIX-2026.09.1",
    status = "no-matrix-data",
    sessions = 0,
    slotsObserved = 0,
    expectedSlots = 56,
    note = "No matrix calibration form rows were present."
  ), file.path(out_dir, "matrix-coverage-summary.json"), pretty = TRUE, auto_unbox = TRUE)
  quit(status = 0)
}

session_slots <- matrix_rows %>%
  distinct(sourceKey, sessionId, formId, matrixEpoch, matrixSlot)

slot_counts <- session_slots %>%
  count(matrixEpoch, matrixSlot, name = "sessions") %>%
  arrange(matrixEpoch, matrixSlot)

item_exposure <- matrix_rows %>%
  count(itemId, domain, family, difficulty, name = "exposures") %>%
  arrange(domain, family, itemId)

family_exposure <- matrix_rows %>%
  count(domain, family, difficulty, name = "exposures") %>%
  arrange(domain, family, difficulty)

slot_values <- sort(unique(session_slots$matrixSlot))
summary <- list(
  version = "1.0",
  analysis = "matrix-coverage",
  matrixVersion = "CIL-MATRIX-2026.09.1",
  status = "ok",
  independentSessions = nrow(session_slots),
  expectedSlots = 56,
  slotsObserved = length(slot_values),
  slotCoverage = length(slot_values) / 56,
  minSessionsPerObservedSlot = min(slot_counts$sessions),
  maxSessionsPerObservedSlot = max(slot_counts$sessions),
  uniqueItemsObserved = n_distinct(matrix_rows$itemId),
  totalFormalResponses = nrow(matrix_rows),
  note = "Coverage statistics are research diagnostics only and do not unlock IQ reporting."
)

write_csv(slot_counts, file.path(out_dir, "matrix-slot-counts.csv"), na = "")
write_csv(item_exposure, file.path(out_dir, "matrix-item-exposure.csv"), na = "")
write_csv(family_exposure, file.path(out_dir, "matrix-family-exposure.csv"), na = "")
write_json(summary, file.path(out_dir, "matrix-coverage-summary.json"), pretty = TRUE, auto_unbox = TRUE)

message("Wrote matrix calibration coverage reports to ", out_dir)
