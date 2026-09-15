#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lavaan)
  library(dplyr)
  library(tidyr)
  library(readr)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
out <- args[2] %||% "calibration/output/cfa-invariance.json"

raw <- independent_sessions(read_calibration(input))

scores <- raw %>%
  group_by(sourceKey, ageBand, domain) %>%
  summarise(score = mean(correct, na.rm = TRUE), answered = n(), .groups = "drop") %>%
  filter(answered >= 3) %>%
  select(-answered) %>%
  pivot_wider(names_from = domain, values_from = score)

age_counts <- scores %>% count(ageBand)
valid_groups <- age_counts %>% filter(n >= 100) %>% pull(ageBand)
scores <- scores %>% filter(ageBand %in% valid_groups)

indicator_names <- setdiff(names(scores), c("sourceKey", "ageBand"))
if (nrow(scores) < 300 || length(indicator_names) < 4 || length(unique(scores$ageBand)) < 2) {
  write_json_report(list(
    version = "1.0",
    analysis = "cfa-age-invariance",
    status = "insufficient-data",
    participants = nrow(scores),
    indicators = indicator_names,
    ageGroups = as.character(unique(scores$ageBand))
  ), out)
  quit(status = 0)
}

safe_name <- function(x) gsub("[^[:alnum:]_]", "_", x)
rename_map <- setNames(vapply(indicator_names, safe_name, character(1)), indicator_names)
for (old in names(rename_map)) names(scores)[names(scores) == old] <- rename_map[[old]]
indicator_names <- unname(rename_map)

model <- paste("g =~", paste(indicator_names, collapse = " + "))

fit_config <- cfa(model, data = scores, group = "ageBand", missing = "fiml", estimator = "MLR")
fit_metric <- cfa(model, data = scores, group = "ageBand", group.equal = c("loadings"), missing = "fiml", estimator = "MLR")
fit_scalar <- cfa(model, data = scores, group = "ageBand", group.equal = c("loadings", "intercepts"), missing = "fiml", estimator = "MLR")

extract_fit <- function(fit) {
  fm <- fitMeasures(fit, c("cfi", "tli", "rmsea", "srmr", "aic", "bic"))
  as.list(unname(fm)) |> setNames(names(fm))
}

config <- extract_fit(fit_config)
metric <- extract_fit(fit_metric)
scalar <- extract_fit(fit_scalar)

report <- list(
  version = "1.0",
  analysis = "score-level-general-factor-and-age-invariance",
  status = "ok",
  note = "This is a provisional score-level invariance screen. Final validity work should use preregistered item-level latent models and external criteria.",
  participants = nrow(scores),
  ageGroups = as.character(unique(scores$ageBand)),
  model = model,
  configural = config,
  metric = metric,
  scalar = scalar,
  delta = list(
    metricVsConfiguralCFI = metric$cfi - config$cfi,
    scalarVsMetricCFI = scalar$cfi - metric$cfi,
    metricVsConfiguralRMSEA = metric$rmsea - config$rmsea,
    scalarVsMetricRMSEA = scalar$rmsea - metric$rmsea
  )
)

write_json_report(report, out)
