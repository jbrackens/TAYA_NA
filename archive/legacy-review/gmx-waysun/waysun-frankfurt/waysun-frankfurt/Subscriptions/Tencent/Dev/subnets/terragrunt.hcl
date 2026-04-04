include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/subnets.hcl"
}

locals {
  env_vars              = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name          = local.env_vars.locals.project_name
  project_id            = local.env_vars.locals.project_id
  environment           = local.env_vars.locals.environment
  region                = local.env_vars.locals.tencent_region
  availability_zone     = local.env_vars.locals.availability_zone
  streaming_subnet_cidr = local.env_vars.locals.streaming_subnet_cidr
  tools_cidr            = local.env_vars.locals.tools_cidr
  microservice_cidr     = local.env_vars.locals.microservice_cidr
  public_route_id       = local.env_vars.locals.public_route_id
  databases_cidr        = local.env_vars.locals.databases_cidr
  load_balancer_subnet_cidr = local.env_vars.locals.load_balancer_subnet_cidr

}

inputs = {
  vpc_id = dependency.vpc.outputs.vpc_id
  subnets = [
    {
      name              = "${local.project_name}-${local.environment}-streaming"
      availability_zone = local.env_vars.locals.availability_zone
      cidr_block        = local.streaming_subnet_cidr
      project_id        = local.project_id
      tags = {
        description = "Streaming subnets for ${local.project_name}-${local.environment}"

      }
    },
    {
      name              = "${local.project_name}-${local.environment}-tools"
      availability_zone = local.env_vars.locals.availability_zone
      cidr_block        = local.tools_cidr
      project_id        = local.project_id
      tags = {
        description = "tools subnets for ${local.project_name}-${local.environment}"
      }
    },
    {
      name              = "${local.project_name}-${local.environment}-microservice"
      availability_zone = local.env_vars.locals.availability_zone
      cidr_block        = local.microservice_cidr
      project_id        = local.project_id
      tags = {
        description = "microservice subnets for ${local.project_name}-${local.environment}"
      }
    },
    {
      name              = "${local.project_name}-${local.environment}-databases"
      availability_zone = local.env_vars.locals.availability_zone
      cidr_block        = local.databases_cidr
      project_id        = local.project_id
      tags = {
        description = "microservice subnets for ${local.project_name}-${local.environment}"
      }
      },
     {
      name              = "${local.project_name}-${local.environment}-loadbalancer"
      availability_zone = local.env_vars.locals.availability_zone
      cidr_block        = local.load_balancer_subnet_cidr
      project_id        = local.project_id
      tags = {
        description = "microservice subnets for ${local.project_name}-${local.environment}"
      }
      },


  ]
}