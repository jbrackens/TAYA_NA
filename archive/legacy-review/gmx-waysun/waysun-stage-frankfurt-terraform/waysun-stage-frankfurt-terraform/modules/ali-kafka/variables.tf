variable "region" {
  description = "The region used to launch this module resources."
  default     = ""
}

variable "profile" {
  description = "The profile name as set in the shared credentials file. If not set, it will be sourced from the ALICLOUD_PROFILE environment variable."
  default     = ""
}

variable "topic_quota" {
  description = "The max num of topic can be create of the instance"
  type        = number
  default     = 50
}

variable "deploy_type" {
  description = "The deploy type of the instance. Currently only support two deploy type, 4: eip/vpc instance, 5: vpc instance."
  type        = number
  default     = 5
}

//https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/alikafka_instance#spec_type
variable "io_max" {
  description = "The max value of io of the instance (20/30/60/90/120). When modify this value, it only support adjust to a greater value."
  type        = number
  default     = 20
}

variable "eip_max" {
  description = "The max bandwidth of the instance. When modify this value, it only support adjust to a greater value."
  type        = number
  default     = null
}

variable "security_group_ids" {
  description = "A list of security group ids to associate with."
  type        = list(string)
  default     = []
}

variable "name" {
  description = "Name to be used on all resources"
  type        = string
  default     = ""
}

variable "paid_type" {
  description = "The paid type of the instance. Support two type, PrePaid: pre paid type instance, PostPaid: post paid type instance. Default is PostPaid"
  type        = string
  default     = "PostPaid"
}

variable "host_name" {
  description = "Host name used on all instances as prefix. Like if the value is TF-ECS-Host-Name and then the final host name would be TF-ECS-Host-Name001, TF-ECS-Host-Name002 and so on."
  type        = string
  default     = ""
}

variable "spec_type" {
  description = "The spec type of the instance. Support two type, normal: normal version instance, professional: professional version instance."
  type        = string
  default     = "normal"
}

variable "vswitch_id" {
  description = "The virtual switch ID to launch in VPC."
  type        = string
  default     = ""
}

variable "vswitch_ids" {
  description = "A list of virtual switch IDs to launch in."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A mapping of tags to assign to the resource."
  type        = map(string)
  default     = {}
}

variable "disk_type" {
  type    = number
  default = 1
}

variable "disk_size" {
  type    = number
  default = 500
}

variable "service_version" {
  type    = string
  default = "2.2.0"
}