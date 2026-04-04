locals {
  env_vars                        = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name                    = local.env_vars.locals.project_name
  project_id                      = local.env_vars.locals.project_id
  environment                     = local.env_vars.locals.environment
  availability_zone               = local.env_vars.locals.availability_zone
  tencent_region                  = local.env_vars.locals.tencent_region
  cidr_block                      = local.env_vars.locals.cidr_block
  region                          = local.env_vars.locals.tencent_region
  vpc_id                          = local.env_vars.locals.vpc_id
  private_route_id                = local.env_vars.locals.private_route_id
  public_route_id                 = local.env_vars.locals.public_route_id
  microservice_with_internet_cidr = local.env_vars.locals.microservice_with_internet_cidr
  streaming_subnet_cidr           = local.env_vars.locals.streaming_subnet_cidr
  databases_cidr                  = local.env_vars.locals.databases_cidr

}

terraform {
  source = "../../../../../modules//security-group"
}

dependency "vpc" {
  config_path = "../../vpc"

  mock_outputs = {
    vpc_cidr_block = "temporary-vpc-cidr"
    vpc_id         = "temporary-vpc-id"
    name           = "temporary-vpc-name"
  }
}

inputs = {
  region = "${local.region}" // tencent_region
  project_id = "${local.project_id}" // project_id
  environment = "${local.environment}" // environment

}