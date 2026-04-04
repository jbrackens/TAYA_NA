 locals {
  env_vars              = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name          = local.env_vars.locals.project_name
  project_id            = local.env_vars.locals.project_id
  environment           = local.env_vars.locals.environment
  tencent_region        = local.env_vars.locals.tencent_region
  cidr_block            = local.env_vars.locals.cidr_block
  region                = local.env_vars.locals.tencent_region

  nat_gateway_tags = {
    project_name = local.project_name
    environment = local.environment
    region = local.region
  }
}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/nat?ref=v3.4.0"
}

dependency "eip" {
    config_path = "../eip"

    mock_outputs = {
        this_eip_public_ip = "temporary-eip-public-ip"
    }
    }

dependency "vpc" {
    config_path = "../vpc"

    mock_outputs = {
        vpc_id = "temporary-vpc-id"
    }
}
inputs = {
tags = local.nat_gateway_tags
}