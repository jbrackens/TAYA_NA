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

variable "region" {
  description = "The region for resources"
  default     = "eu-frankfurt"
  #default     = "eu-frankfurt"
}

variable "vpc_id" {
  description = "The optional vpc id"
  default     = "vpc-40xkp1o3"
}

variable "cluster_cidr" {
  description = "The CIDR range for cluster"
  default     = "192.168.0.0/24"
}

variable "cluster_name" {
  description = "The name of cluster"
  default     = "test-cluster"
}

variable "cluster_version" {
  description = "The version of cluster"
  default     = ""
}

variable "cluster_desc" {
  description = "The description of cluster"
  default     = "test-cluster"
}

variable "cluster_max_service_num" {
  description = "The max service num of cluster"
  default     = 32
}

variable "cluster_max_pod_num" {
  description = "The max pod num of cluster"
  default     = 32
}

variable "cluster_deploy_type" {
  description = "The deploy type of cluster"
  default     = "MANAGED_CLUSTER"
}

variable "cluster_internet" {
  description = "The internet of cluster"
  type        = bool
  default     = true
}

variable "internet_charge_type" {
  description = "The charge type of internet"
  type        = string
  default     = "TRAFFIC_POSTPAID_BY_HOUR"
}

variable "project_id" {
  description = "The project id"
  default     = "1000000665"
}

#variable "key_id" {
#  description = "The key id"
#  default     = "AKIDZ7Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z6Z"
#}

variable "subnet1_id" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}

variable "subnet2_id" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-koxkkjri"
}

variable "service_cidr" {
  description = "The CIDR range for service"
  type        = string
  default     = "192.168.1.0/24"
}

variable "default_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S5.MEDIUM4"
}

variable "sg_ids" {
  description = "The ID of security group used by TKE"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "tag" {
  description = "The tags of cluster"
  type        = map(string)
  default = {
    "tag1" = "value1",
    "tag2" = "value2",
  }
}

variable "worker_config" {
  type = list(object({
    number_worker             = string
    worker_availability_zone  = string
    worker_subnet_id          = string
    worker_instance_name      = string
    worker_instance_type      = string
    worker_system_disk_type   = string
    worker_system_disk_size   = string
    worker_image_id           = string
    worker_security_group_ids = list(string)
    worker_password           = string
  }))
  default = [
    {
      number_worker             = 2
      worker_availability_zone  = "na-siliconvalley-1"
      worker_subnet_id          = "subnet-pq7krkow"
      worker_instance_name      = "test"
      worker_instance_type      = "S3.SMALL1"
      worker_system_disk_type   = "CLOUD_PREMIUM"
      worker_system_disk_size   = "50"
      worker_image_id           = "img-p2q58c5s"
      worker_security_group_ids = ["sg-6677zhua"]
      worker_password           = "Jahh9655221,"
    }
  ]
}

variable "microservices_name" {
  description = "The microservices name"
  type        = string
  default     = "test-microservice"
}

variable "microservices_min_size" {
  description = "The microservices min size"
  type        = string
  default     = "1"
}

variable "microservices_desired_size" {
  description = "The microservices desired capacity"
  type        = string
  default     = "1"
}

variable "microservices_max_size" {
  description = "The microservices max size"
  type        = string
  default     = "1"
}

variable "microservices_security_group_ids" {
  description = "The ID of security group used by microservices"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "microservices_key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "microservices_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S6.MEDIUM8"
}

variable "microservices_subnet_ids1" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}
variable "microservices_subnet_ids2" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}


variable "streaming_security_group_ids" {
  description = "The ID of security group used by microservices"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "streaming_key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "streaming_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S6.MEDIUM8"
}

variable "streaming_subnet_ids1" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}
variable "streaming_subnet_ids2" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}

variable "processing_security_group_ids" {
  description = "The ID of security group used by microservices"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "processing_key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "processing_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S6.MEDIUM8"
}

variable "processing_subnet_ids1" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}
variable "processing_subnet_ids2" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}


variable "keycloak_security_group_ids" {
  description = "The ID of security group used by microservices"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "keycloak_key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "keycloak_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S6.MEDIUM8"
}

variable "keycloak_subnet_ids1" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}
variable "keycloak_subnet_ids2" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}

variable "tools_security_group_ids" {
  description = "The ID of security group used by microservices"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "tools_key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "tools_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S6.MEDIUM8"
}

variable "tools_subnet_ids1" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}
variable "tools_subnet_ids2" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}



variable "core_security_group_ids" {
  description = "The ID of security group used by microservices"
  type        = list(string)
  default     = ["sg-6677zhua"]
}

variable "core_key_ids" {
  description = "The IDs of access keys"
  type        = list(string)
  default     = ["skey-1mtd83az"]
}

variable "core_instance_type" {
  description = "The default machine type for cluster node(s)"
  type        = string
  default     = "S6.MEDIUM8"
}

variable "core_subnet_ids1" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}
variable "core_subnet_ids2" {
  description = "The subnet ID."
  type        = string
  default     = "subnet-pq7krkow"
}