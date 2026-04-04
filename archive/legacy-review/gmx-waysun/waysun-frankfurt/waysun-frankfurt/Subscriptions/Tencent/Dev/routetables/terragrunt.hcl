include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/routetables.hcl"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  region            = local.env_vars.locals.tencent_region
  availability_zone = local.env_vars.locals.availability_zone
  cidr_block        = local.env_vars.locals.cidr_block
}

inputs = {
  vpc_id   = dependency.vpc.outputs.vpc_id
  vpc_cidr = local.cidr_block

  route_tables = [
    { name = "${local.project_name}-${local.environment}-rt-public", tags = { projects = "${local.project_id}" } }
  ]


  tags = {
    name = "${local.project_name}-${local.environment}-route-tables"
  }

}