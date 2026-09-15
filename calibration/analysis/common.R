suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(tidyr)
  library(jsonlite)
})

required_columns <- c(
  "sourceKey", "sessionId", "ageYears", "ageBand", "itemId", "domain",
  "correct", "skipped", "timeout", "seconds"
)

read_calibration <- function(path) {
  x <- read_csv(path, show_col_types = FALSE, progress = FALSE)
  missing <- setdiff(required_columns, names(x))
  if (length(missing)) stop("Missing required columns: ", paste(missing, collapse = ", "))

  x %>%
    mutate(
      ageYears = as.integer(ageYears),
      correct = as.numeric(correct),
      skipped = as.numeric(skipped),
      timeout = as.numeric(timeout),
      seconds = as.numeric(seconds),
      ageBand = factor(ageBand, levels = c("18–24", "25–34", "35–44", "45–54", "55–65"))
    ) %>%
    filter(ageYears >= 18, ageYears <= 65, correct %in% c(0, 1))
}

# Default research analyses use one session per pseudonymous source key so repeated
# tests from one browser are not silently treated as independent people.
independent_sessions <- function(x) {
  first_session <- x %>%
    distinct(sourceKey, sessionId) %>%
    group_by(sourceKey) %>%
    slice(1) %>%
    ungroup()

  x %>% semi_join(first_session, by = c("sourceKey", "sessionId"))
}

response_matrix <- function(x, domain_name = NULL, min_item_n = 30) {
  y <- x
  if (!is.null(domain_name)) y <- y %>% filter(domain == domain_name)

  keep_items <- y %>%
    count(itemId, name = "n") %>%
    filter(n >= min_item_n) %>%
    pull(itemId)

  y %>%
    filter(itemId %in% keep_items) %>%
    select(sourceKey, itemId, correct) %>%
    distinct(sourceKey, itemId, .keep_all = TRUE) %>%
    pivot_wider(names_from = itemId, values_from = correct) %>%
    arrange(sourceKey)
}

participant_age_table <- function(x) {
  x %>%
    distinct(sourceKey, ageYears, ageBand) %>%
    group_by(sourceKey) %>%
    slice(1) %>%
    ungroup()
}

write_json_report <- function(x, path) {
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  write_json(x, path, pretty = TRUE, auto_unbox = TRUE, na = "null")
  message("Wrote ", path)
}
