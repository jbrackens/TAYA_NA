include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/sg.hcl"
}

locals {
  env_vars                   = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name               = local.env_vars.locals.project_name
  project_id                 = local.env_vars.locals.project_id
  environment                = local.env_vars.locals.environment
  availability_zone          = local.env_vars.locals.availability_zone
  cidr_block                 = local.env_vars.locals.cidr_block
  region                     = local.env_vars.locals.region_id
  security_group_name        = "${local.project_name}-${local.environment}-filtered-LB-sg"
  security_group_description = "api gateway security group"
}

inputs = {
  security_group_name        = "${local.security_group_name}"        //"${local.project_name}-${local.environment}-postgres-sg"
  security_group_description = "${local.security_group_description}" //"Security group for ${local.project_name}-${local.environment}-postgres"
  vpc_id                     = dependency.vpc.outputs.vpc_id


  ingress_with_cidr_blocks = [
    {
      cidr_block  = "65.115.166.202/32"
      description = "Charles Mersereau"
      port        = "443"
  },
      {
      cidr_block  = "91.226.196.46/32"
      description = "Wojciech"
      port        = "443"
  },
    {
      port        = "443"
      protocol    = "TCP"
      cidr_block  = "212.250.151.149/32"
      policy      = "accept"
      description = "s:fw02-lon:SSH"
    }]

  egress_with_cidr_blocks = [
    {
      cidr_block  = "0.0.0.0/0"
      description = "allow all"
  }]

  env_tags = {
    name      = "${local.project_name}-${local.environment}-filtered-sg"
    projectID = "${local.project_id}"
    env       = "${local.environment}"
  }
}