locals {
  random_string = replace(random_uuid.this.result, "-", "")
  project_name  = "sls-module-project-${local.random_string}"
  store_name    = "sls-module-store-${local.random_string}"

  result_name = var.use_random_suffix ? substr("${var.project_name}-${local.random_string}", 0, 63) : var.project_name
}

resource "random_uuid" "this" {}
