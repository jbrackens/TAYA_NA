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
  source = "../../../../modules//tencentcloud-redis"
}

inputs = {
  vpc_id           = local.vpc_id
  availability_zone = local.availability_zone

  redis_mem_size        = 1024
  redis_shard_num = 1
  redis_replicas_num = 1
  redis_names           = ["${local.project_name}-${local.environment}-redis"]
  port            = 6379
  redis_charge_type = ["POSTPAID"]
  redis_type_id = 8
  redis_prepaid_period = 1
  redis_force_delete = true
  redis_backup_period = ["Saturday"]
  redis_backup_time = "03:00-04:00"
  security_groups = ["sg-f9e08dc6"]
  project_id      = local.project_id
  subnet_id       = "subnet-fbq8l6ls"

  redis_tags = [{
    "Name" = "${local.project_name}-${local.environment}-redis"

  }]


}