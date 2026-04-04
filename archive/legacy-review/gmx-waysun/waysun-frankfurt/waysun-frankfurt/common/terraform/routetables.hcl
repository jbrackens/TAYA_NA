locals {
  env_vars              = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name          = local.env_vars.locals.project_name
  project_id            = local.env_vars.locals.project_id
  environment           = local.env_vars.locals.environment
  tencent_region        = local.env_vars.locals.tencent_region
  cidr_block            = local.env_vars.locals.cidr_block
}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/terraform-tencentcloud-network/modules/route_tables?ref=v3.4.0"
}

dependency "vpc"{
  config_path = "../vpc"

  mock_outputs = {
    vpc_id                 = "temporary-vpc-id"
    vpc_cidr_block         = "temporary-vpc-cidr"
    name                   = "temporary-vpc-name"
  }
}

dependency "subnet"{
  config_path = "../subnets"

  mock_outputs = {
    id              = "temporary-subnet-id"
    cidr_block      = "temporary-subnet-cidr"
    name            = "temporary-subnet-name"
  }
}