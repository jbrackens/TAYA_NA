include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/nat.hcl"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  region            = local.env_vars.locals.tencent_region
  availability_zone = local.env_vars.locals.availability_zone
}

inputs = {
  nat_gateway_name = "${local.project_name}-${local.environment}-nat-eip"
  vpc_id = dependency.vpc.outputs.vpc_id
  nat_max_concurrent = 1000000
  assigned_eip_set = ["43.131.48.8"]
  nat_bandwidth = "10"
  region = "eu-frankfurt"
  project_id = local.project_id


}