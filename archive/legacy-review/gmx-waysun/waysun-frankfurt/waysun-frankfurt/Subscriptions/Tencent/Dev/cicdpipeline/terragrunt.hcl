include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/cicdpipeline.hcl"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  availability_zone = local.env_vars.locals.availability_zone
  cidr_block        = local.env_vars.locals.cidr_block
  region            = local.env_vars.locals.region_id
  vpc_id            = local.env_vars.locals.vpc_id
}

inputs = {
  instance_name = "${local.project_name}-${local.environment}-manual-deployer"
  availability_zone       = "${local.availability_zone}"
  region = "${local.region}"
  image_id = "img-eb30mz89"
  private_ip = "10.16.0.18"
  project_id = "${local.project_id}"


}