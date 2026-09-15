#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(jsonlite)
})

`%||%` <- function(x, y) if (is.null(x) || length(x) == 0 || is.na(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
cil_path <- args[1] %||% "calibration/data/calibration-responses.csv"
external_path <- args[2] %||% "calibration/data/external-validation.csv"
out <- args[3] %||% "calibration/output/external-linking.json"

cil <- read_csv(cil_path, show_col_types = FALSE, progress = FALSE)
ext <- read_csv(external_path, show_col_types = FALSE, progress = FALSE)

required_cil <- c("sourceKey", "sessionId", "ageYears", "cpi")
required_ext <- c("sourceKey", "sessionId", "instrumentId", "administrationId", "ageYears", "externalScoreType", "externalScore", "itemContentStored", "scoringKeyStored")
missing_cil <- setdiff(required_cil, names(cil))
missing_ext <- setdiff(required_ext, names(ext))
if (length(missing_cil)) stop("CIL export missing: ", paste(missing_cil, collapse = ", "))
if (length(missing_ext)) stop("External file missing: ", paste(missing_ext, collapse = ", "))

as_false <- function(x) tolower(trimws(as.character(x))) %in% c("false", "0", "no", "n")
if (!all(as_false(ext$itemContentStored))) stop("Protected external item content must not be stored in the linking file")
if (!all(as_false(ext$scoringKeyStored))) stop("Protected external scoring keys must not be stored in the linking file")

cil_sessions <- cil %>%
  mutate(ageYears = as.integer(ageYears), cpi = as.numeric(cpi)) %>%
  filter(is.finite(cpi), ageYears >= 18, ageYears <= 65) %>%
  distinct(sourceKey, sessionId, .keep_all = TRUE) %>%
  select(sourceKey, sessionId, ageYears, cpi)

ext_clean <- ext %>%
  mutate(ageYears = as.integer(ageYears), externalScore = as.numeric(externalScore)) %>%
  filter(is.finite(externalScore), ageYears >= 18, ageYears <= 65) %>%
  distinct(sourceKey, sessionId, instrumentId, administrationId, .keep_all = TRUE)

linked <- inner_join(cil_sessions, ext_clean, by = c("sourceKey", "sessionId"), suffix = c("Cil", "External")) %>%
  filter(ageYearsCil == ageYearsExternal)

summarize_instrument <- function(x) {
  n <- nrow(x)
  if (n < 30) return(list(status = "insufficient-data", n = n, minimumForExploration = 30, minimumForPrimaryEvidence = 100))

  pearson <- suppressWarnings(cor(x$cpi, x$externalScore, method = "pearson", use = "complete.obs"))
  spearman <- suppressWarnings(cor(x$cpi, x$externalScore, method = "spearman", use = "complete.obs"))
  fit <- lm(externalScore ~ cpi + ageYearsCil, data = x)
  sm <- summary(fit)
  coef_rows <- coef(sm)

  list(
    status = if (n >= 100) "exploratory-validity-evidence" else "pilot-only",
    n = n,
    pearsonR = unname(pearson),
    spearmanRho = unname(spearman),
    adjustedR2 = unname(sm$adj.r.squared),
    cpiSlope = unname(coef_rows["cpi", "Estimate"]),
    cpiSlopeP = unname(coef_rows["cpi", "Pr(>|t|)"]),
    ageSlope = unname(coef_rows["ageYearsCil", "Estimate"]),
    ageSlopeP = unname(coef_rows["ageYearsCil", "Pr(>|t|)"]),
    iqConversionUnlocked = FALSE
  )
}

by_instrument <- split(linked, linked$instrumentId)
reports <- lapply(by_instrument, summarize_instrument)

report <- list(
  version = "1.0",
  analysis = "external-common-person-linking",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  linkedParticipants = nrow(linked),
  instruments = reports,
  safety = list(
    storesExternalItems = FALSE,
    storesExternalScoringKeys = FALSE,
    autoConvertsCpiToIq = FALSE,
    interpretation = "Convergent/linking evidence only; IQ remains locked until the full norming criteria are satisfied."
  )
)

dir.create(dirname(out), recursive = TRUE, showWarnings = FALSE)
write_json(report, out, pretty = TRUE, auto_unbox = TRUE, na = "null")
message("Wrote ", out)
