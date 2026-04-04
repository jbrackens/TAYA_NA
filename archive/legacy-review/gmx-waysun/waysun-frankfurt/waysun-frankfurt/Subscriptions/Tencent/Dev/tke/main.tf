/**
 * Copyright 2020 Tencent Cloud, LLC
 *
 * Licensed under the Mozilla Public License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.mozilla.org/en-US/MPL/2.0/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

##############################
#         TKE Instance
##############################

//this is the cluster with empty worker config
resource "tencentcloud_kubernetes_cluster" "managed_cluster" {
  vpc_id       = var.vpc_id
  cluster_cidr = var.cluster_cidr
  #service_cidr            = var.service_cidr
  cluster_max_pod_num                        = var.cluster_max_pod_num
  cluster_name                               = var.cluster_name
  cluster_desc                               = var.cluster_desc
  cluster_max_service_num                    = var.cluster_max_service_num
  cluster_version                            = var.cluster_version
  cluster_deploy_type                        = var.cluster_deploy_type
  cluster_internet                           = var.cluster_internet
  managed_cluster_internet_security_policies = ["98.153.142.170/32"]
  project_id                                 = var.project_id

  ##########################
  # Test out worker_config #
  ##########################

  dynamic "worker_config" {
    for_each = var.worker_config

    content {
      count             = worker_config.value.number_worker
      availability_zone = worker_config.value.worker_availability_zone
      subnet_id         = worker_config.value.worker_subnet_id

      enhanced_security_service = true
      enhanced_monitor_service  = true
      public_ip_assigned        = false
      internet_charge_type      = var.internet_charge_type
      #      internet_max_bandwidth_out = 10
      instance_name      = worker_config.value.worker_instance_name
      instance_type      = worker_config.value.worker_instance_type
      system_disk_type   = worker_config.value.worker_system_disk_type
      system_disk_size   = worker_config.value.worker_system_disk_size
      img_id             = worker_config.value.worker_image_id
      security_group_ids = worker_config.value.worker_security_group_ids
      key_ids            = var.key_ids
      user_data          = "dGVzdA=="
      #      password                   = worker_config.value.worker_password
    }
  }

  labels = {
    "label1" = "label1"
  }

  #  tags = var.tag
}

//this is one example of managing node using node pool

resource "tencentcloud_kubernetes_node_pool" "microservices" {
  name                 = var.microservices_name
  cluster_id           = tencentcloud_kubernetes_cluster.managed_cluster.id
  max_size             = var.microservices_max_size
  min_size             = var.microservices_min_size
  vpc_id               = var.vpc_id
  subnet_ids           = [var.microservices_subnet_ids1]
  retry_policy         = "INCREMENTAL_INTERVALS"
  termination_policies = ["NEWEST_INSTANCE"]
  desired_capacity     = var.microservices_desired_size
  enable_auto_scale    = true
  delete_keep_instance = false
  default_cooldown     = 360
  #scaling_group_project_id = 0

  auto_scaling_config {
    instance_type      = var.microservices_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = "50"
    security_group_ids = var.microservices_security_group_ids
    key_ids            = var.microservices_key_ids

    data_disk {
      disk_type = "CLOUD_PREMIUM"
      disk_size = 50
    }

    internet_charge_type = var.internet_charge_type

    # Only support bandwidth when public_ip_assigned=true
    # internet_max_bandwidth_out = 10
    public_ip_assigned = false
    #user_data                 = "base64-encoded data"
    # password                   = "test123#"
    enhanced_security_service = false
    enhanced_monitor_service  = false

  }

  labels = {
    "nodes-type" = "microservices-nodes"
  }

  #  taints {
  #    key    = "test_taint2"
  #    value  = "taint_value2"
  #    effect = "PreferNoSchedule"
  #  }

  #node_config {
  #  extra_args = [
  #    "root-dir=/var/lib/kubelet"
  #  ]
  #}
}

resource "tencentcloud_kubernetes_node_pool" "streaming" {
  name       = "streaming"
  cluster_id = tencentcloud_kubernetes_cluster.managed_cluster.id
  max_size   = 4
  min_size   = 0
  #  desired_capacity = 2
  vpc_id       = var.vpc_id
  subnet_ids   = [var.streaming_subnet_ids1]
  retry_policy = "INCREMENTAL_INTERVALS"
  #termination_policies     = ["NEWEST_INSTANCE"]
  desired_capacity     = 1
  enable_auto_scale    = true
  delete_keep_instance = false
  default_cooldown     = 360
  #scaling_group_project_id = 0

  auto_scaling_config {
    instance_type      = var.streaming_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = "50"
    security_group_ids = var.streaming_security_group_ids
    key_ids            = var.streaming_key_ids

    data_disk {
      disk_type = "CLOUD_PREMIUM"
      disk_size = 50
    }

    internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"

    # Only support bandwidth when public_ip_assigned=true
    # internet_max_bandwidth_out = 10
    public_ip_assigned = false
    #user_data                 = "base64-encoded data"
    # password                   = "test123#"
    enhanced_security_service = false
    enhanced_monitor_service  = false

  }

  labels = {
    "node-type" = "streaming-nodes"
  }

  #  taints {
  #    key    = "test_taint2"
  #    value  = "taint_value2"
  #    effect = "PreferNoSchedule"
  #  }

  #node_config {
  #  extra_args = [
  #    "root-dir=/var/lib/kubelet"
  #  ]
  #}
}

resource "tencentcloud_kubernetes_node_pool" "processing" {
  name       = "processing"
  cluster_id = tencentcloud_kubernetes_cluster.managed_cluster.id
  max_size   = 3
  min_size   = 0
  #  desired_capacity = 2
  vpc_id       = var.vpc_id
  subnet_ids   = [var.processing_subnet_ids1]
  retry_policy = "INCREMENTAL_INTERVALS"
  #termination_policies     = ["NEWEST_INSTANCE"]
  desired_capacity     = 1
  enable_auto_scale    = true
  delete_keep_instance = false
  default_cooldown     = 360
  #scaling_group_project_id = 0

  auto_scaling_config {
    instance_type      = var.processing_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = "50"
    security_group_ids = var.processing_security_group_ids
    key_ids            = var.processing_key_ids

    data_disk {
      disk_type = "CLOUD_PREMIUM"
      disk_size = 50
    }

    internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"

    # Only support bandwidth when public_ip_assigned=true
    # internet_max_bandwidth_out = 10
    public_ip_assigned = false
    #user_data                 = "base64-encoded data"
    # password                   = "test123#"
    enhanced_security_service = false
    enhanced_monitor_service  = false

  }

  labels = {
    "nodes-type" = "processing-nodes",
  }

  #  taints {
  #    key    = "test_taint2"
  #    value  = "taint_value2"
  #    effect = "PreferNoSchedule"
  #  }

  #node_config {
  #  extra_args = [
  #    "root-dir=/var/lib/kubelet"
  #  ]
  #}
}

resource "tencentcloud_kubernetes_node_pool" "keycloak" {
  name       = "identity-provider"
  cluster_id = tencentcloud_kubernetes_cluster.managed_cluster.id
  max_size   = 2
  min_size   = 1
  #  desired_capacity = 2
  vpc_id       = var.vpc_id
  subnet_ids   = [var.keycloak_subnet_ids1]
  retry_policy = "INCREMENTAL_INTERVALS"
  #termination_policies     = ["NEWEST_INSTANCE"]
  desired_capacity     = 1
  enable_auto_scale    = true
  delete_keep_instance = false
  default_cooldown     = 360
  #scaling_group_project_id = 0

  auto_scaling_config {
    instance_type      = var.keycloak_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = "50"
    security_group_ids = var.keycloak_security_group_ids
    key_ids            = var.keycloak_key_ids

    data_disk {
      disk_type = "CLOUD_PREMIUM"
      disk_size = 50
    }

    internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"

    # Only support bandwidth when public_ip_assigned=true
    # internet_max_bandwidth_out = 10
    public_ip_assigned = false
    #user_data                 = "base64-encoded data"
    # password                   = "test123#"
    enhanced_security_service = false
    enhanced_monitor_service  = false

  }

  labels = {
    "nodes-type" = "identity-provider-nodes",
  }

  #  taints {
  #    key    = "test_taint2"
  #    value  = "taint_value2"
  #    effect = "PreferNoSchedule"
  #  }

  #node_config {
  #  extra_args = [
  #    "root-dir=/var/lib/kubelet"
  #  ]
  #}
}

resource "tencentcloud_kubernetes_node_pool" "tools" {
  name       = "tools"
  cluster_id = tencentcloud_kubernetes_cluster.managed_cluster.id
  max_size   = 3
  min_size   = 0
  #  desired_capacity = 2
  vpc_id       = var.vpc_id
  subnet_ids   = [var.tools_subnet_ids1]
  retry_policy = "INCREMENTAL_INTERVALS"
  #termination_policies     = ["NEWEST_INSTANCE"]
  desired_capacity     = 1
  enable_auto_scale    = true
  delete_keep_instance = false
  default_cooldown     = 360
  #scaling_group_project_id = 0

  auto_scaling_config {
    instance_type      = var.tools_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = "50"
    security_group_ids = var.tools_security_group_ids
    key_ids            = var.tools_key_ids

    data_disk {
      disk_type = "CLOUD_PREMIUM"
      disk_size = 50
    }

    internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"

    # Only support bandwidth when public_ip_assigned=true
    # internet_max_bandwidth_out = 10
    public_ip_assigned = false
    #user_data                 = "base64-encoded data"
    # password                   = "test123#"
    enhanced_security_service = false
    enhanced_monitor_service  = false

  }

  labels = {
    "nodes-type" = "tools-nodes",
  }

  #  taints {
  #    key    = "test_taint2"
  #    value  = "taint_value2"
  #    effect = "PreferNoSchedule"
  #  }

  #node_config {
  #  extra_args = [
  #    "root-dir=/var/lib/kubelet"
  #  ]
  #}
}

#resource "tencentcloud_kubernetes_node_pool" "core" {
#  name       = "waysun-dev-core"
#  cluster_id = tencentcloud_kubernetes_cluster.managed_cluster.id
#  max_size   = 2
#  min_size   = 1
#  #  desired_capacity = 2
#  vpc_id       = var.vpc_id
#  subnet_ids   = [var.core_subnet_ids1]
#  retry_policy = "INCREMENTAL_INTERVALS"
#  #termination_policies     = ["NEWEST_INSTANCE"]
#  desired_capacity     = 1
#  enable_auto_scale    = true
#  delete_keep_instance = false
#  default_cooldown     = 360
#  #scaling_group_project_id = 0
#
#  auto_scaling_config {
#    instance_type      = var.core_instance_type
#    system_disk_type   = "CLOUD_PREMIUM"
#    system_disk_size   = "50"
#    security_group_ids = var.core_security_group_ids
#    key_ids            = var.core_key_ids
#
#    data_disk {
#      disk_type = "CLOUD_PREMIUM"
#      disk_size = 50
#    }
#
#    internet_charge_type = "TRAFFIC_POSTPAID_BY_HOUR"
#
#    # Only support bandwidth when public_ip_assigned=true
#    # internet_max_bandwidth_out = 10
#    public_ip_assigned = false
#    #user_data                 = "base64-encoded data"
#    # password                   = "test123#"
#    enhanced_security_service = false
#    enhanced_monitor_service  = false
#
#  }
#
#  labels = {
#    "nodes-type" = "k8s-tools",
#  }
#
#  #  taints {
#  #    key    = "test_taint2"
#  #    value  = "taint_value2"
#  #    effect = "PreferNoSchedule"
#  #  }
#
#  #node_config {
#  #  extra_args = [
#  #    "root-dir=/var/lib/kubelet"
#  #  ]
#  #}
#}