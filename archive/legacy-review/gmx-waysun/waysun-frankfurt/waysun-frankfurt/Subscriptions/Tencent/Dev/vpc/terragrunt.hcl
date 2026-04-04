include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/vpc.hcl"
}

locals {
  env_vars     = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name = local.env_vars.locals.project_name
  environment  = local.env_vars.locals.environment
  project_id   = local.env_vars.locals.project_id
  is_multicast = false
}

inputs = {
  vpc_name         = "${local.project_name}-${local.environment}-vpc"
  project_id       = "${local.project_id}"
  vpc_cidr         = local.env_vars.locals.cidr_block
  vpc_is_multicast = local.is_multicast

  tags = {
    name = "test"
    environment = "${local.environment}"
    project = "${local.project_name}"
    projectId = "${local.project_id}"
  }
  vpc_tags = {
#    name = "${local.project_name}-${local.environment}-vpc"
#    environment = "${local.environment}"
#    project = "${local.project_name}"
#    projectId = "${local.project_id}"
    description = "VPC for ${local.project_name}-${local.environment}"
  }


}