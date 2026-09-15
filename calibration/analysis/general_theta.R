#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(tidyr)
  library(jsonlite)
})

`%||%` <- function(x, y) if (is.null(x) || length(x) == 0 || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
theta_input <- args[1] %||% "calibration/output/participant-domain-theta.csv"
response_input <- args[2] %||% "calibration/output/pooled-study/pooled-independent-responses.csv"
out <- args[3] %||% "calibration/output/participant-general-theta.csv"
manifest_out <- args[4] %||% file.path(dirname(out), "general-theta-manifest.json")

theta <- read_csv(theta_input, show_col_types = FALSE, progress = FALSE)
responses <- read_csv(response_input, show_col_types = FALSE, progress = FALSE)

required_theta <- c("sourceKey", "domain", "F1")
required_response <- c("sourceKey", "ageYears", "ageBand")
missing_theta <- setdiff(required_theta, names(theta))
missing_response <- setdiff(required_response, names(responses))
if (length(missing_theta)) stop("Domain theta file missing: ", paste(missing_theta, collapse = ", "))
if (length(missing_response)) stop("Response file missing: ", paste(missing_response, collapse = ", "))

age <- responses %>%
  distinct(sourceKey, ageYears, ageBand) %>%
  group_by(sourceKey) %>%
  slice(1) %>%
  ungroup()

domain_scores <- theta %>%
  transmute(sourceKey, domain, theta = as.numeric(F1)) %>%
  filter(is.finite(theta)) %>%
  distinct(sourceKey, domain, .keep_all = TRUE)

# Domain EAP scores are fitted independently. Standardize each fitted domain within
# the calibration cohort before combining so arbitrary domain-scale drift does not
# dominate the provisional composite. This is a research bridge, not a validated g
# score and never unlocks product IQ reporting.
domain_scores <- domain_scores %>%
  group_by(domain) %>%
  mutate(
    domainMean = mean(theta, na.rm = TRUE),
    domainSd = sd(theta, na.rm = TRUE),
    thetaZ = if_else(is.finite(domainSd) & domainSd > 0, (theta - domainMean) / domainSd, NA_real_)
  ) %>%
  ungroup()

wide <- domain_scores %>%
  select(sourceKey, domain, thetaZ) %>%
  pivot_wider(names_from = domain, values_from = thetaZ)

domain_cols <- setdiff(names(wide), "sourceKey")
if (length(domain_cols) < 4) stop("Need at least four fitted domains to build provisional general theta")

mat <- as.matrix(wide[, domain_cols, drop = FALSE])
domains_observed <- rowSums(is.finite(mat))
provisional <- apply(mat, 1, function(x) {
  z <- x[is.finite(x)]
  if (length(z) < 4) return(NA_real_)
  mean(z)
})

out_df <- tibble(
  sourceKey = wide$sourceKey,
  theta = provisional,
  domainsObserved = domains_observed,
  compositeMethod = "mean-of-within-domain-standardized-EAP-theta_RESEARCH_ONLY"
) %>%
  filter(is.finite(theta), domainsObserved >= 4) %>%
  inner_join(age, by = "sourceKey") %>%
  select(sourceKey, ageYears, ageBand, theta, domainsObserved, compositeMethod)

dir.create(dirname(out), recursive = TRUE, showWarnings = FALSE)
write_csv(out_df, out, na = "")

manifest <- list(
  version = "1.0",
  analysis = "provisional-general-theta-composite",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  participants = nrow(out_df),
  fittedDomainsAvailable = length(domain_cols),
  minimumDomainsPerParticipant = 4,
  modelBasedGeneralFactor = FALSE,
  researchOnly = TRUE,
  productIqUnlocked = FALSE,
  warning = "This provisional composite is only a bridge for calibration diagnostics. It is not a validated g factor or IQ score and must not be exposed as product IQ."
)
write_json(manifest, manifest_out, pretty = TRUE, auto_unbox = TRUE, na = "null")
message("Wrote provisional research general theta to ", out)
message("Product IQ remains locked.")
