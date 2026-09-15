#!/usr/bin/env Rscript

required <- c(
  "psych",
  "mirt",
  "lavaan",
  "lordif",
  "readr",
  "dplyr",
  "tidyr",
  "jsonlite"
)

optional <- c("equateIRT")
installed <- rownames(installed.packages())
missing <- setdiff(required, installed)
if (length(missing)) {
  message("Installing required packages: ", paste(missing, collapse = ", "))
  install.packages(missing, repos = "https://cloud.r-project.org")
}

missing_optional <- setdiff(optional, rownames(installed.packages()))
if (length(missing_optional)) {
  message("Optional packages not installed: ", paste(missing_optional, collapse = ", "))
  message("Install them when external anchor linking/equating is ready.")
}

message("Calibration analysis dependencies are ready.")
