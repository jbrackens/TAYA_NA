include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/publicrt.hcl"
}

locals {
  env_vars                 = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name             = local.env_vars.locals.project_name
  project_id               = local.env_vars.locals.project_id
  environment              = local.env_vars.locals.environment
  region                   = local.env_vars.locals.tencent_region
  availability_zone        = local.env_vars.locals.availability_zone
  streaming_subnet_cidr    = local.env_vars.locals.streaming_subnet_cidr
  microservice_with_internet_cidr = local.env_vars.locals.microservice_with_internet_cidr
  tools_cidr               = local.env_vars.locals.tools_cidr
  microservice_cidr        = local.env_vars.locals.microservice_cidr
  public_route_id          = local.env_vars.locals.public_route_id
  route_table_id          = "rtb-gkg8bq4k"

}

inputs = {
  vpc_id = dependency.vpc.outputs.vpc_id
#  route_tables = [{name="${local.project_name}-${local.environment}-rt-public", tags={projects="${local.project_id}"}}]
  subnets = [
   {
      name              = "${local.project_name}-${local.environment}-microservice-with-internet"
      availability_zone = local.env_vars.locals.availability_zone
      cidr_block        = local.microservice_with_internet_cidr
      project_id        = local.project_id
      route_table_id    = local.route_table_id
      tags              = {
        description = " public microservice subnets for ${local.project_name}-${local.environment}"
      }
    }
    ]
  route_entries = [
#      {
#         route_table_name       = "${local.project_name}-${local.environment}-rt-public"
#         route_table_id         = local.route_table_id
#         destination_cidr_block = "171.16.0.0/16"
#         next_type              = "EIP"
#         next_hub               = "0"
#         description            = "Subnet for ${local.project_name}-${local.environment}"
#      },
      {
         route_table_name       = "${local.project_name}-${local.environment}-rt-public"
         route_table_id         = local.route_table_id
         destination_cidr_block = "0.0.0.0/0"
         next_type              = "NAT"
         next_hub               = "nat-icu4b1ha"
         description            = "microservice-with-internet-route-table-entry"
      }
    ]

  tags = {
    Name = "${local.project_name}-${local.environment}-microservice-with-internet"
  }
}