#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(lordif)
  library(dplyr)
  library(readr)
  library(jsonlite)
})
source("calibration/analysis/common.R")

`%||%` <- function(x, y) if (is.null(x) || is.na(x) || !nzchar(x)) y else x
args <- commandArgs(trailingOnly = TRUE)
input <- args[1] %||% "calibration/data/calibration-responses.csv"
truth_file <- args[2] %||% "calibration/output/v11-true-domain-theta.csv"
pipeline_theta_file <- args[3] %||% "calibration/output/participant-domain-theta.csv"
out <- args[4] %||% "calibration/output/v11-dif-conditioning-layers-diagnostic.json"

analysis_seed_text <- Sys.getenv("CIL_ANALYSIS_SEED", unset = "")
if (nzchar(analysis_seed_text)) {
  analysis_seed <- suppressWarnings(as.integer(analysis_seed_text))
  if (is.na(analysis_seed) || analysis_seed < 1L) stop("CIL_ANALYSIS_SEED must be a positive integer")
  set.seed(analysis_seed)
}

finite_or_na <- function(x) {
  value <- suppressWarnings(as.numeric(x))
  ifelse(is.finite(value), value, NA_real_)
}

column_or_na <- function(stats, name, n) {
  if (is.null(stats) || !(name %in% names(stats))) return(rep(NA_real_, n))
  values <- finite_or_na(stats[[name]])
  if (length(values) != n) return(rep(NA_real_, n))
  values
}

summarize_out <- function(out, item_ids) {
  if (is.null(out)) {
    return(list(
      available = FALSE,
      statisticalFlags = NA_integer_,
      materialByMcFaddenR2 = NA_integer_,
      statisticalFlagRate = NA_real_,
      materialByMcFaddenR2Rate = NA_real_,
      flaggedItems = list(),
      materialItems = list()
    ))
  }
  stats <- if (is.null(out$stats)) NULL else as.data.frame(out$stats, stringsAsFactors = FALSE)
  if (!is.null(stats) && nrow(stats) != length(item_ids)) stats <- NULL
  flags <- as.logical(out$flag)
  if (length(flags) != length(item_ids)) flags <- rep(NA, length(item_ids))
  pseudo13 <- column_or_na(stats, "pseudo13.McFadden", length(item_ids))
  material <- !is.na(pseudo13) & pseudo13 >= 0.02
  flagged_idx <- which(flags %in% TRUE)
  material_idx <- which(material %in% TRUE)
  list(
    available = !is.null(stats),
    statisticalFlags = length(flagged_idx),
    materialByMcFaddenR2 = length(material_idx),
    statisticalFlagRate = length(flagged_idx) / length(item_ids),
    materialByMcFaddenR2Rate = length(material_idx) / length(item_ids),
    flaggedItems = lapply(flagged_idx, function(i) list(
      itemId = item_ids[[i]],
      chi12P = column_or_na(stats, "chi12", length(item_ids))[[i]],
      chi13P = column_or_na(stats, "chi13", length(item_ids))[[i]],
      chi23P = column_or_na(stats, "chi23", length(item_ids))[[i]],
      pseudo13McFadden = pseudo13[[i]],
      materialByMcFaddenR2 = isTRUE(material[[i]])
    )),
    materialItems = lapply(material_idx, function(i) list(
      itemId = item_ids[[i]],
      statisticalFlag = isTRUE(flags[[i]]),
      pseudo13McFadden = pseudo13[[i]]
    ))
  )
}

run_with_theta <- function(item_ids, resp, theta, group) {
  if (length(theta) != nrow(resp) || any(!is.finite(theta))) return(NULL)
  tryCatch(
    rundif(
      item = item_ids,
      resp = resp,
      theta = theta,
      gr = group,
      criterion = "Chisqr",
      alpha = 0.01,
      beta.change = 0.1,
      pseudo.R2 = "McFadden",
      R2.change = 0.02,
      wt = NULL
    ),
    error = function(e) NULL
  )
}

fit_leave_one_out_theta <- function(resp, target_item) {
  other_items <- setdiff(colnames(resp), target_item)
  if (!(target_item %in% colnames(resp)) || length(other_items) < 5) return(NULL)
  fit <- tryCatch(
    mirt(
      as.data.frame(resp[, other_items, drop = FALSE]),
      1,
      itemtype = "2PL",
      technical = list(NCYCLES = 1000),
      verbose = FALSE
    ),
    error = function(e) e
  )
  if (inherits(fit, "error")) return(NULL)
  scores <- tryCatch(fscores(fit, method = "EAP"), error = function(e) e)
  if (inherits(scores, "error")) return(NULL)
  theta <- finite_or_na(as.data.frame(scores)[[1]])
  if (length(theta) != nrow(resp) || any(!is.finite(theta))) return(NULL)
  theta
}

extract_target_dif <- function(out, item_ids, target_item) {
  idx <- match(target_item, item_ids)
  if (is.null(out) || is.na(idx)) return(list(available = FALSE, itemId = target_item))
  stats <- if (is.null(out$stats)) NULL else as.data.frame(out$stats, stringsAsFactors = FALSE)
  if (is.null(stats) || nrow(stats) != length(item_ids)) {
    return(list(available = FALSE, itemId = target_item))
  }
  flags <- as.logical(out$flag)
  pseudo13 <- column_or_na(stats, "pseudo13.McFadden", length(item_ids))
  list(
    available = TRUE,
    itemId = target_item,
    statisticalFlag = isTRUE(flags[[idx]]),
    chi12P = column_or_na(stats, "chi12", length(item_ids))[[idx]],
    chi13P = column_or_na(stats, "chi13", length(item_ids))[[idx]],
    chi23P = column_or_na(stats, "chi23", length(item_ids))[[idx]],
    pseudo13McFadden = pseudo13[[idx]],
    materialByMcFaddenR2 = is.finite(pseudo13[[idx]]) && pseudo13[[idx]] >= 0.02
  )
}

cor_safe <- function(a, b) {
  keep <- is.finite(a) & is.finite(b)
  if (sum(keep) < 3) return(NA_real_)
  suppressWarnings(cor(a[keep], b[keep]))
}

summarize_age_band_theta_shift <- function(group, initial_theta, sparse_theta) {
  if (length(initial_theta) != length(group) || length(sparse_theta) != length(group) ||
      any(!is.finite(initial_theta)) || any(!is.finite(sparse_theta))) {
    return(list(available = FALSE, maxAbsoluteMeanShiftZ = NA_real_, ageBands = list()))
  }
  initial_sd <- sd(initial_theta)
  sparse_sd <- sd(sparse_theta)
  if (!is.finite(initial_sd) || initial_sd <= 0 || !is.finite(sparse_sd) || sparse_sd <= 0) {
    return(list(available = FALSE, maxAbsoluteMeanShiftZ = NA_real_, ageBands = list()))
  }
  initial_z <- (initial_theta - mean(initial_theta)) / initial_sd
  sparse_z <- (sparse_theta - mean(sparse_theta)) / sparse_sd
  summary <- tibble(
    ageBand = as.character(group),
    initialZ = initial_z,
    sparseZ = sparse_z
  ) %>%
    group_by(ageBand) %>%
    summarize(
      n = n(),
      initialMeanZ = mean(initialZ),
      sparseMeanZ = mean(sparseZ),
      sparseMinusInitialMeanZ = mean(sparseZ - initialZ),
      .groups = "drop"
    )
  shifts <- abs(summary$sparseMinusInitialMeanZ)
  list(
    available = TRUE,
    maxAbsoluteMeanShiftZ = if (length(shifts)) max(shifts) else 0,
    ageBands = lapply(seq_len(nrow(summary)), function(i) as.list(summary[i, , drop = FALSE]))
  )
}

raw <- independent_sessions(read_calibration(input))
age <- participant_age_table(raw)
truth <- read_csv(truth_file, show_col_types = FALSE)
pipeline_theta <- read_csv(pipeline_theta_file, show_col_types = FALSE)
if (!("F1" %in% names(pipeline_theta))) stop("participant-domain-theta.csv must contain F1")

domains <- sort(unique(raw$domain))
leave_one_out_targets <- c(
  "verbal-comprehension" = "SYN-01-13",
  "processing-speed" = "SYN-05-14"
)
domain_reports <- list()
aggregate_counts <- list(
  trueTheta = c(statistical = 0L, material = 0L),
  pipelineEap = c(statistical = 0L, material = 0L),
  lordifInitial = c(statistical = 0L, material = 0L),
  lordifSparse = c(statistical = 0L, material = 0L),
  lordifFinal = c(statistical = 0L, material = 0L)
)
all_complete <- TRUE

for (domain_name in domains) {
  wide <- response_matrix(raw, domain_name, min_item_n = 100)
  if (nrow(wide) < 250 || ncol(wide) < 6) {
    all_complete <- FALSE
    next
  }

  domain_truth <- truth %>% filter(domain == domain_name) %>% select(sourceKey, trueTheta)
  domain_pipeline <- pipeline_theta %>% filter(domain == domain_name) %>% select(sourceKey, F1)
  dat <- wide %>%
    inner_join(age, by = "sourceKey") %>%
    inner_join(domain_truth, by = "sourceKey") %>%
    inner_join(domain_pipeline, by = "sourceKey")
  group <- droplevels(dat$ageBand)
  response_names <- setdiff(names(wide), "sourceKey")
  resp <- as.data.frame(dat[, response_names, drop = FALSE])
  observed_share <- vapply(resp, function(x) mean(!is.na(x)), numeric(1))
  resp <- resp[, observed_share >= 0.5, drop = FALSE]
  if (ncol(resp) < 5) {
    all_complete <- FALSE
    next
  }

  person_share <- apply(resp, 1, function(x) mean(!is.na(x)))
  keep_people <- person_share >= 0.5
  resp <- resp[keep_people, , drop = FALSE]
  group <- droplevels(group[keep_people])
  true_theta <- finite_or_na(dat$trueTheta[keep_people])
  pipeline_eap <- finite_or_na(dat$F1[keep_people])
  if (nrow(resp) < 200 || nlevels(group) < 3 || any(!is.finite(true_theta)) || any(!is.finite(pipeline_eap))) {
    all_complete <- FALSE
    next
  }

  fit <- tryCatch(
    lordif(resp, group, criterion = "Chisqr", alpha = 0.01, pseudo.R2 = "McFadden"),
    error = function(e) e
  )
  if (inherits(fit, "error")) {
    all_complete <- FALSE
    next
  }

  initial_theta <- if (!is.null(fit$calib$theta)) finite_or_na(fit$calib$theta) else rep(NA_real_, nrow(resp))
  sparse_theta <- if (!is.null(fit$calib.sparse) && !is.null(fit$calib.sparse$theta)) {
    finite_or_na(fit$calib.sparse$theta)
  } else {
    rep(NA_real_, nrow(resp))
  }
  final_theta <- if (all(is.finite(sparse_theta))) sparse_theta else initial_theta
  item_ids <- colnames(resp)

  true_out <- run_with_theta(item_ids, resp, true_theta, group)
  pipeline_out <- run_with_theta(item_ids, resp, pipeline_eap, group)
  initial_out <- run_with_theta(item_ids, resp, initial_theta, group)
  sparse_out <- if (all(is.finite(sparse_theta))) run_with_theta(item_ids, resp, sparse_theta, group) else NULL
  final_out <- list(stats = fit$stats, flag = fit$flag)

  sources <- list(
    trueTheta = summarize_out(true_out, item_ids),
    pipelineEap = summarize_out(pipeline_out, item_ids),
    lordifInitial = summarize_out(initial_out, item_ids),
    lordifSparse = summarize_out(sparse_out, item_ids),
    lordifFinal = summarize_out(final_out, item_ids)
  )

  leave_one_out <- list(available = FALSE)
  if (domain_name %in% names(leave_one_out_targets)) {
    target_item <- unname(leave_one_out_targets[[domain_name]])
    loo_theta <- fit_leave_one_out_theta(resp, target_item)
    if (!is.null(loo_theta)) {
      loo_out <- run_with_theta(item_ids, resp, loo_theta, group)
      leave_one_out <- list(
        available = !is.null(loo_out),
        targetItem = target_item,
        thetaCorrelationWithFullEap = cor_safe(loo_theta, pipeline_eap),
        thetaCorrelationWithTrueTheta = cor_safe(loo_theta, true_theta),
        targetDif = extract_target_dif(loo_out, item_ids, target_item)
      )
    } else {
      leave_one_out <- list(available = FALSE, targetItem = target_item)
    }
  }

  for (source_name in names(sources)) {
    source <- sources[[source_name]]
    if (isTRUE(source$available)) {
      aggregate_counts[[source_name]][["statistical"]] <- aggregate_counts[[source_name]][["statistical"]] + source$statisticalFlags
      aggregate_counts[[source_name]][["material"]] <- aggregate_counts[[source_name]][["material"]] + source$materialByMcFaddenR2
    } else if (source_name != "lordifSparse") {
      all_complete <- FALSE
    }
  }

  domain_reports[[domain_name]] <- list(
    participants = nrow(resp),
    items = length(item_ids),
    lordifIterations = fit$iteration,
    lordifSparseAvailable = all(is.finite(sparse_theta)),
    thetaCorrelations = list(
      trueVsPipelineEap = cor_safe(true_theta, pipeline_eap),
      trueVsLordifInitial = cor_safe(true_theta, initial_theta),
      trueVsLordifSparse = if (all(is.finite(sparse_theta))) cor_safe(true_theta, sparse_theta) else NA_real_,
      pipelineEapVsLordifInitial = cor_safe(pipeline_eap, initial_theta),
      lordifInitialVsSparse = if (all(is.finite(sparse_theta))) cor_safe(initial_theta, sparse_theta) else NA_real_
    ),
    ageBandPurificationShift = summarize_age_band_theta_shift(group, initial_theta, sparse_theta),
    leaveOneOutMatching = leave_one_out,
    sources = sources
  )
}

source_summary <- lapply(names(aggregate_counts), function(source_name) {
  counts <- aggregate_counts[[source_name]]
  list(
    source = source_name,
    statisticalFlags = as.integer(counts[["statistical"]]),
    materialByMcFaddenR2 = as.integer(counts[["material"]]),
    statisticalFlagRate = as.numeric(counts[["statistical"]]) / 42,
    materialByMcFaddenR2Rate = as.numeric(counts[["material"]]) / 42
  )
})
names(source_summary) <- names(aggregate_counts)

initial_material <- source_summary$lordifInitial$materialByMcFaddenR2
sparse_material <- source_summary$lordifSparse$materialByMcFaddenR2
final_material <- source_summary$lordifFinal$materialByMcFaddenR2
pipeline_material <- source_summary$pipelineEap$materialByMcFaddenR2
true_material <- source_summary$trueTheta$materialByMcFaddenR2

classification <- if (!all_complete) {
  "incomplete"
} else if (true_material == 0 && initial_material == 0 && sparse_material == final_material && final_material > 0) {
  "lordif-purification-feedback-supported"
} else if (true_material == 0 && initial_material > 0) {
  "initial-estimated-theta-error-supported"
} else if (true_material == 0 && pipeline_material > 0 && initial_material == 0) {
  "pipeline-eap-only-artifact"
} else if (true_material == 0 && final_material > initial_material) {
  "lordif-purification-amplifies-estimated-theta-artifact"
} else if (true_material == 0 && final_material > 0) {
  "response-estimated-theta-artifact-supported"
} else {
  "conditioning-layer-not-sufficient"
}

report <- list(
  version = "CIL-V11-DIF-CONDITIONING-LAYERS-2026.09.2",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  analysis = "v11-post-failure-conditioning-layer-isolation",
  method = list(
    criterion = "Chisqr",
    alpha = 0.01,
    pseudoR2 = "McFadden",
    referenceR2Change = 0.02,
    sources = c("trueTheta", "pipelineEap", "lordifInitial", "lordifSparse", "lordifFinal")
  ),
  complete = all_complete && length(domain_reports) == 6,
  summary = source_summary,
  domains = domain_reports,
  finding = list(
    classification = classification,
    trueThetaMaterialFlags = true_material,
    pipelineEapMaterialFlags = pipeline_material,
    lordifInitialMaterialFlags = initial_material,
    lordifSparseMaterialFlags = sparse_material,
    lordifFinalMaterialFlags = final_material
  ),
  governance = list(
    postFailureDiagnosticOnly = TRUE,
    confirmatoryVerdictRemains = "failed-confirmatory",
    changesConfirmatoryVerdict = FALSE,
    thresholdChangesAllowed = FALSE,
    productNormEligible = FALSE,
    productIqUnlocked = FALSE,
    autoCpiToIq = FALSE
  )
)

dir.create(dirname(out), recursive = TRUE, showWarnings = FALSE)
write_json(report, out, pretty = TRUE, auto_unbox = TRUE, na = "null")
cat("Wrote v11 conditioning-layer DIF diagnostic to", out, "\n")
