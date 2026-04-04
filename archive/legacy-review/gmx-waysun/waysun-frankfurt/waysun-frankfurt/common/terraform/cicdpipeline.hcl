locals {
  env_vars              = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name          = local.env_vars.locals.project_name
  project_id            = local.env_vars.locals.project_id
  environment           = local.env_vars.locals.environment
  tencent_region        = local.env_vars.locals.tencent_region
  cidr_block            = local.env_vars.locals.cidr_block
  availability_zone     = local.env_vars.locals.availability_zone
#  vpc_id                = local.env_vars.locals.vpc_id


}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/instance?ref=v3.4.0"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_cidr_block         = "temporary-vpc-cidr"
    vpc_id                 = "temporary-vpc-id"
    name                   = "temporary-vpc-name"
  }
}

dependency "security-group" {
  config_path = "../security-groups/cicdpipeline"

  mock_outputs = {
    security_group_id      = "temporary-security-group-id"
    security_group_name    = "temporary-security-group-name"
  }
}

inputs = {
  security_groups = [dependency.security-group.outputs.security_group_id]
  create_eip = true
  vpc_id = dependency.vpc.outputs.vpc_id
  subnet_id = "subnet-j5vej5fc"
  instance_type = "S5.SMALL1"
  key_name = "skey-d91ws5xz"
}