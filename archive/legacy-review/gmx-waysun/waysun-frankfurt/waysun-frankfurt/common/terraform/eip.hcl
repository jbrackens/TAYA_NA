locals {
  env_vars              = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name          = local.env_vars.locals.project_name
  project_id            = local.env_vars.locals.project_id
  environment           = local.env_vars.locals.environment
  tencent_region        = local.env_vars.locals.tencent_region
  cidr_block            = local.env_vars.locals.cidr_block
  region_id             = local.env_vars.locals.region_id
}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/eip?ref=v3.4.0"
}
