include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/tcr.hcl"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  availability_zone = local.env_vars.locals.availability_zone
  cidr_block        = local.env_vars.locals.cidr_block
  region            = local.env_vars.locals.region_id
}

inputs = {
  subnet_id               = ["subnet-fnur4ul6"]
  instance_type           = "basic"
}