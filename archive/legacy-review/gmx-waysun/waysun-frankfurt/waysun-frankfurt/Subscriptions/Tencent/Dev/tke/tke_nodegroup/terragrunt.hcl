include "root" {
  path = find_in_parent_folders()
}

#include {
#  path = find_in_parent_folders()
#}

include "env_common" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/common/terraform/nodepool.hcl"
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

dependency "micro_service_internet_cidr" {
  config_path = "../../micro_with_internet_rt"

  mock_outputs = {
    subnet_id = "temporary-subnet-id"
    subnet_name = "temporary-subnet-name"
  }
}

dependency "tke"{
  config_path = "../"

  mock_outputs = {
    cluster_id = "temporary-cluster-id"
    cluster_name = "temporary-cluster-name"
  }
}

inputs = [
  {
    name                     = "${local.project_name}-${local.environment}-identity-provider"
    cluster_id               = dependency.tke.outputs.cluster_id
    max_size                 = 3
    min_size                 = 1
    desired_capacity         = 1
    vpc_id                   = local.vpc_id
    subnet_ids               = dependency.micro_service_internet_cidr.outputs.subnet_id
    retry_policy             = "INCREMENTAL_INTERVALS"
    #termination_policies     = ["NEWEST_INSTANCE"]
    desired_capacity         = 2
    enable_auto_scale        = true
    delete_keep_instance     = false
    default_cooldown         = 360
    scaling_group_project_id = local.project_id


    auto_scaling_config = [
      {
        instance_type      = "S5.SMALL2"
        system_disk_type   = "CLOUD_PREMIUM"
        system_disk_size   = "50"
        security_group_ids = ["sg-mmrp5osg", "sg-8w0mquiq", "sg-04kjyo18", "sg-luy23wli"]
        key_ids            = "skey-qxveqdz1"


        disk_type = "CLOUD_PREMIUM"
        disk_size = 50


        internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"

        # Only support bandwidth when public_ip_assigned=true
        # internet_max_bandwidth_out = 10
        public_ip_assigned        = false
        #user_data                 = "base64-encoded data"
        # password                   = "test123#"
        enhanced_security_service = false
        enhanced_monitor_service  = false

      }]
        labels = {
          "created_by" = "jliao",
          "bu"         = "nasa",
        }

        taints = {
          key    = "test_taint2"
          value  = "taint_value2"
          effect = "PreferNoSchedule"
        }
      }
    ]



#},
#  {
#    name                 = "scalablenodepool2"
#    cluster_id           = tencentcloud_kubernetes_cluster.managed_cluster.id
#    max_size             = 3
#    min_size             = 1
#    vpc_id               = var.vpc_id
#    subnet_ids           = [var.subnet1_id, var.subnet2_id]
#    retry_policy         = "INCREMENTAL_INTERVALS"
#    #termination_policies     = ["NEWEST_INSTANCE"]
#    desired_capacity     = 2
#    enable_auto_scale    = true
#    delete_keep_instance = false
#    default_cooldown     = 360
#    #scaling_group_project_id = 0
#
#    auto_scaling_config = {
#      instance_type      = var.default_instance_type
#      system_disk_type   = "CLOUD_PREMIUM"
#      system_disk_size   = "50"
#      security_group_ids = var.sg_ids
#      key_ids            = var.key_ids
#
#      data_disk = {
#        disk_type = "CLOUD_PREMIUM"
#        disk_size = 50
#      }
#
#      internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"
#
#      # Only support bandwidth when public_ip_assigned=true
#      # internet_max_bandwidth_out = 10
#      public_ip_assigned        = false
#      #user_data                 = "base64-encoded data"
#      # password                   = "test123#"
#      enhanced_security_service = false
#      enhanced_monitor_service  = false
#
#    }
#
#    labels = {
#      "created_by" = "jliao",
#      "bu"         = "nasa",
#    }
#
#    taints = {
#      key    = "test_taint2"
#      value  = "taint_value2"
#      effect = "PreferNoSchedule"
#    }
#  }]
