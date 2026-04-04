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
  postgresql_engine_version = local.env_vars.locals.postgres.postgresql_engine_version
  postgresql_charset = local.env_vars.locals.postgres.postgresql_charset
  postgresql_memory  = local.env_vars.locals.postgres.postgresql_memory
  postgresql_storage = local.env_vars.locals.postgres.postgresql_storage
  postgresql_charge_type = local.env_vars.locals.postgres.postgresql_charge_type
  postgresql_root_password = local.env_vars.locals.postgres.postgresql_root_password
  postgresql_root_user     = local.env_vars.locals.postgres.postgresql_root_user
  security_groups= local.env_vars.locals.postgres.security_groups
}
terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/rds/postgresql?ref=v3.4.0"
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
    vpc_id                          = local.vpc_id
    subnet_id                       = "subnet-fbq8l6ls"

    project_id                   = "${local.project_id}"
    postgresql_availability_zone = "${local.availability_zone}"

    #postgresql instance
    postgresql_name           = "${local.project_name}-${local.environment}-db"
    postgresql_engine_version = local.postgresql_engine_version
    postgresql_charset        = local.postgresql_charset
    postgresql_memory         = local.postgresql_memory
    postgresql_storage        = local.postgresql_storage
    security_groups           = local.security_groups
    region = local.region_id

    #charge type
    postgresql_charge_type = local.postgresql_charge_type

    #rds security
    postgresql_root_user       = local.postgresql_root_user
    postgresql_root_password   = local.postgresql_root_password

  }

