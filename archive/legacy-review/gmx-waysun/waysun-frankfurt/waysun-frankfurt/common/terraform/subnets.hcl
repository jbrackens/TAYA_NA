locals {
  env_vars                  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name              = local.env_vars.locals.project_name
  project_id                = local.env_vars.locals.project_id
  environment               = local.env_vars.locals.environment
  tencent_region            = local.env_vars.locals.tencent_region
  cidr_block                = local.env_vars.locals.cidr_block
  availability_zone         = local.env_vars.locals.availability_zone
  streaming_subnet_cidr     = local.env_vars.locals.streaming_subnet_cidr
  tools_cidr                = local.env_vars.locals.tools_cidr
  microservice_cidr         = local.env_vars.locals.microservice_cidr
  vpc_id                    = local.env_vars.locals.vpc_id
  private_route_id          = local.env_vars.locals.private_route_id
  public_route_id           = local.env_vars.locals.public_route_id
  load_balancer_subnet_cidr = local.env_vars.locals.load_balancer_subnet_cidr

}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/terraform-tencentcloud-network/modules/subnets?ref=v3.4.0"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_cidr_block         = "temporary-vpc-cidr"
    vpc_id                 = "temporary-vpc-id"
    name                   = "temporary-vpc-name"
  }
}

inputs = {

  vpc_id = local.vpc_id



  vpc_tags ={
environment = "${local.environment}"
project = "${local.project_name}"
tencentRegion = "${local.tencent_region}"
projectId = "${local.project_id}"
}

}