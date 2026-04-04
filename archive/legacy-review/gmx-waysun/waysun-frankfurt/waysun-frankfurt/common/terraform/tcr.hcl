locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  tencent_region    = local.env_vars.locals.tencent_region
  cidr_block        = local.env_vars.locals.cidr_block
  vpc_id            = local.env_vars.locals.vpc_id
  availability_zone = local.env_vars.locals.availability_zone
  region_id         = local.env_vars.locals.region_id
}

terraform {
  source = "../../../../modules//tcr2"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_cidr_block = "temporary-vpc-cidr"
    vpc_id         = "temporary-vpc-id"
    name           = "temporary-vpc-name"
  }
}

inputs = {
  vpc_id            = [local.vpc_id]
  name                     = "instanceName"
  instance_name            = "${local.project_name}-${local.environment}"
  delete_bucket            = true
  token_state              = true
  token_is_public          = true
  open_public_operation    = true

  cidr_block               = local.cidr_block #"10.16.0.0/16"
  availability_zone        = local.availability_zone
  namespace_repository_map = [
    ["stella", "leaderboard"],
    ["stella", "user-context"],
    ["stella", "wallet"],
    ["stella", "achievement"],
    ["stella", "identity-provider"],
    ["stella", "event-ingestor"],
    ["stella", "rule-configurator"]
  ]
  security_policy        = [
    {
      cidr_block  = local.cidr_block
      description = "Allow access to vpc in the ${local.project_name}-${local.environment}-dev namespace"
    },
    {
      cidr_block  = "54.194.105.187/32"
      description = "Allow access to jenkins in the ${local.project_name}-${local.environment}-dev namespace"
    }, {
      cidr_block  = "212.250.151.149/32"
      description = "Allow access to fw-lon in the ${local.project_name}-${local.environment}-dev namespace"
    }
  ]
  tags                     = {
    environment = "${local.environment}"
                project = "${local.project_name}"
                tencentRegion = "${local.tencent_region}"
                projectId = "${local.project_id}"
  }
}