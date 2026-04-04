include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/eip.hcl"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  region            = local.env_vars.locals.tencent_region
  availability_zone = local.env_vars.locals.availability_zone
  region_id         = local.env_vars.locals.region_id
}


inputs = {
  project_id = "${local.project_id}"
#  region = "${local.region}"
  region = "${local.region_id}"
  number_of_eips                 = 2
  eip_name                       = "waysun-dev"
  eip_internet_max_bandwidth_out = 5

}