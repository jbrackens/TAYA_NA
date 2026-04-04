#include "root" {
#  path = find_in_parent_folders()
#}
#include {
#  path = find_in_parent_folders()
#}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/nodepool.hcl"
}

terraform {
  source = "git@github.com:flipadmin/eeg-terraform-modules//terraform/modules/tencent/k8s-cluster?ref=v3.4.0"
}

locals {
  env_vars          = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project_name      = local.env_vars.locals.project_name
  project_id        = local.env_vars.locals.project_id
  environment       = local.env_vars.locals.environment
  availability_zone = local.env_vars.locals.availability_zone
  cidr_block        = local.env_vars.locals.cidr_block
  region            = local.env_vars.locals.region_id
  vpc_id            = local.env_vars.locals.vpc_id
#  microservice_with_internet_cidr = local.env_vars.locals.microservice_with_internet_cidr
  cluster_identity_provider = "identity_provider"
}

inputs = {
  vpc_id       = local.vpc_id
  cluster_cidr = "172.16.0.0/16"
  #service_cidr            = var.service_cidr
  cluster_max_pod_num                        = 32
  cluster_name                               = "tf-tke-jliao-test"
  cluster_desc                               = "Test out TKE using node pool(s)"
  cluster_max_service_num                    = 32
  cluster_version                            = "1.18.4"
  cluster_deploy_type                        = "MANAGED_CLUSTER"
  cluster_internet                           = true
#  managed_cluster_internet_security_policies = ["98.153.142.170/32"]
  project_id                                 = local.project_id
}