locals {
  env_vars              = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name          = local.env_vars.locals.project_name
  project_id            = local.env_vars.locals.project_id
  environment           = local.env_vars.locals.environment
  tencent_region        = local.env_vars.locals.tencent_region
  cidr_block            = local.env_vars.locals.cidr_block
  availability_zone     = local.env_vars.locals.availability_zone
  region_id            = local.env_vars.locals.region_id
#  vpc_id                = local.env_vars.locals.vpc_id
}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/clb?ref=v3.4.0"
}

dependency "vpc" {
  config_path = "../../../vpc"

  mock_outputs = {
    vpc_id = "temporary-vpc-id"
  }
}

#dependency "subnet" {
#  config_path = "../../subnets"
#
#  mock_outputs = {
#    subnets_name_id = "temporary-subnets-name-id"
#  }
#}

inputs = {
  network_type = "OPEN"
  vpc_id = dependency.vpc.outputs.vpc_id
  internet_max_bandwidth_out = 10
  project_id = "${local.project_id}"
  region = "${local.region_id}"
  clb_subnet_id =  "subnet-fnur4ul6"
#  security_groups = ["${local.project_id}-achievement-clb-sg"]
  health_check_switch = true
#  region = "${local.tencent_region}"
}