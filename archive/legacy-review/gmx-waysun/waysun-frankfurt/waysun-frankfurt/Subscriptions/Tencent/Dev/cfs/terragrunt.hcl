include "root" {
  path = find_in_parent_folders()
}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/cfs.hcl"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  availability_zone = local.env_vars.locals.tencent_region
  cidr_block        = local.env_vars.locals.cidr_block
  region            = local.env_vars.locals.region_id
  vpc_id            = local.env_vars.locals.vpc_id
#  region            = local.env_vars.locals.region_id
  tencent_region    = local.env_vars.locals.region_id
}

inputs = {
  cfs_name = "${local.project_name}-${local.environment}-cfs"
  cfs_protocol = "NFS"
  cfs_subnet_id = "subnet-hlyrujsk"
  rw_permission = ["RW", "RW"]
  cfs_availability_zone = "${local.availability_zone}"
  cfs_access_group_name = "${local.project_name}-${local.environment}-cfs-access-group"
  cfs_access_group_description = "Access group for ${local.project_name}-${local.environment}-cfs"
  user_permission = ["no_root_squash", "no_root_squash"]
  priority = [1, 1]
  auth_client_ip = ["10.16.11.0/24", "192.168.0.0/16"]
  storage_type = "SD"
  region = "${local.tencent_region}"
#  region  = "${local.region}"
}