#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
out_csv <- if (length(args) >= 1) args[[1]] else file.path(tempdir(), 'icar-sapa-source.csv')

source_url <- 'https://dataverse.harvard.edu/api/access/dataset/:persistentId/?persistentId=doi:10.7910/DVN/AD9RVY'
item_pattern <- '^(LN|MR|VR|R3D)[._-]?[0-9]+$'

parent_dir <- dirname(out_csv)
dir.create(parent_dir, recursive = TRUE, showWarnings = FALSE)
work_dir <- tempfile('cil-icar-acquire-')
dir.create(work_dir, recursive = TRUE)
zip_path <- file.path(work_dir, 'icar-sapa-dataverse.zip')
unzip_dir <- file.path(work_dir, 'unzipped')
dir.create(unzip_dir)

message('Downloading public CC0 ICAR/SAPA dataset from Harvard Dataverse...')
utils::download.file(source_url, zip_path, mode = 'wb', quiet = FALSE, method = 'libcurl')
if (!file.exists(zip_path) || file.info(zip_path)$size < 1000) {
  stop('Dataverse download did not produce a plausible archive.')
}

zip_listing <- tryCatch(utils::unzip(zip_path, list = TRUE), error = function(e) NULL)
if (is.null(zip_listing) || nrow(zip_listing) == 0) {
  stop('Downloaded Dataverse payload is not a readable ZIP archive.')
}
utils::unzip(zip_path, exdir = unzip_dir)
all_files <- list.files(unzip_dir, recursive = TRUE, full.names = TRUE)

find_frame_in_rdata <- function(path) {
  env <- new.env(parent = globalenv())
  loaded <- load(path, envir = env)
  candidates <- list()
  for (name in loaded) {
    obj <- get(name, envir = env)
    if (!(is.data.frame(obj) || is.matrix(obj))) next
    frame <- as.data.frame(obj, check.names = FALSE, stringsAsFactors = FALSE)
    item_cols <- names(frame)[grepl(item_pattern, names(frame), ignore.case = TRUE)]
    if (length(item_cols) == 60) {
      candidates[[length(candidates) + 1]] <- list(name = name, frame = frame, item_cols = item_cols)
    }
  }
  if (!length(candidates)) return(NULL)
  candidates[[which.max(vapply(candidates, function(x) nrow(x$frame), numeric(1)))]]
}

find_frame_in_csv <- function(path) {
  header <- tryCatch(read.csv(path, nrows = 1, check.names = FALSE, stringsAsFactors = FALSE), error = function(e) NULL)
  if (is.null(header)) return(NULL)
  item_cols <- names(header)[grepl(item_pattern, names(header), ignore.case = TRUE)]
  if (length(item_cols) != 60) return(NULL)
  frame <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  list(name = basename(path), frame = frame, item_cols = item_cols)
}

preferred_rdata <- all_files[grepl('sapaICARData18aug2010thru20may2013\\.(rdata|rda)$', basename(all_files), ignore.case = TRUE)]
rdata_files <- unique(c(preferred_rdata, all_files[grepl('\\.(rdata|rda)$', all_files, ignore.case = TRUE)]))
selected <- NULL
selected_path <- NULL

for (path in rdata_files) {
  candidate <- tryCatch(find_frame_in_rdata(path), error = function(e) NULL)
  if (!is.null(candidate)) {
    selected <- candidate
    selected_path <- path
    break
  }
}

if (is.null(selected)) {
  csv_files <- all_files[grepl('\\.csv$', all_files, ignore.case = TRUE)]
  for (path in csv_files) {
    candidate <- tryCatch(find_frame_in_csv(path), error = function(e) NULL)
    if (!is.null(candidate)) {
      selected <- candidate
      selected_path <- path
      break
    }
  }
}

if (is.null(selected)) {
  stop('Could not locate a published ICAR/SAPA table with exactly 60 scored ICAR columns.')
}

frame <- selected$frame
item_cols <- selected$item_cols
age_candidates <- names(frame)[tolower(trimws(names(frame))) == 'age']
if (!length(age_candidates)) {
  age_candidates <- names(frame)[grepl('^age[._ -]?years?$', names(frame), ignore.case = TRUE)]
}
if (!length(age_candidates)) stop('Could not locate age column in the published ICAR/SAPA table.')
age_col <- age_candidates[[1]]

out <- frame[, c(age_col, item_cols), drop = FALSE]
write.csv(out, out_csv, row.names = FALSE, na = '', quote = TRUE)

message(sprintf('ICAR/SAPA acquisition complete: %d source rows, 60 scored items.', nrow(out)))
message(sprintf('Source object/file: %s :: %s', basename(selected_path), selected$name))
message(sprintf('Age column: %s', age_col))
message(sprintf('Staged CSV: %s', out_csv))
message('Raw third-party data remain in runner-local temporary storage and are not committed.')
