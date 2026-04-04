variable "region" {
  description = "The region used to launch this module resources."
  type        = string
  default     = ""
}

variable "profile" {
  description = "The profile name as set in the shared credentials file. If not set, it will be sourced from the ALICLOUD_PROFILE environment variable."
  type        = string
  default     = ""
}
variable "shared_credentials_file" {
  description = "This is the path to the shared credentials file. If this is not set and a profile is specified, $HOME/.aliyun/config.json will be used."
  type        = string
  default     = ""
}

variable "skip_region_validation" {
  description = "Skip static validation of region ID. Used by users of alternative AlibabaCloud-like APIs or users w/ access to regions that are not public (yet)."
  type        = bool
  default     = false
}

variable "create_log_service" {
  description = "Whether to create log resources. If true, a new machine group and logtail config will be created and associate them."
  type        = bool
  default     = true
}

variable "project_name" {
  description = "A log project name used to create a new machine group and logtail config, this parameter is required if you will use this module to create logtail resources."
  type        = string
  default     = ""
}

variable "logstore_name" {
  description = "The log store name used to create a new logtail config, this parameter is required if you will use this module to create logtail resources."
  type        = string
  default     = ""
}

// log machine group variables
variable "log_machine_group_name" {
  description = "Log machine group name. If not set, a default name with prefix `sls-logtail-module-group-` will be returned."
  type        = string
  default     = ""
}

variable "log_machine_identify_type" {
  description = "The machine identification type, including IP and user-defined identity. Valid values are 'ip' and 'userdefined'. Default to 'ip'."
  type        = string
  default     = "ip"
}

variable "log_machine_topic" {
  description = "The topic of a machine group."
  type        = string
  default     = ""
}

// logtail config variables
variable "config_input_type" {
  description = "The input type. Currently only two types are supported: `file` and `plugin`."
  type        = string
  default     = "file"
}

variable "config_log_sample" {
  description = "The log sample of the Logtail configuration. The log size cannot exceed 1,000 bytes."
  type        = string
  default     = ""
}

variable "config_name" {
  description = "The Logtail configuration name. If not set, a default name with prefix `sls-logtail-module-config-` will be returned."
  type        = string
  default     = ""
}

variable "config_output_type" {
  description = "The output type. Currently, only LogService is supported."
  type        = string
  default     = "LogService"
}

variable "config_input_detail" {
  description = "The logtail configure the required JSON files, this parameter is required if you will use this module to create logtail config. ([Refer to details](https://www.alibabacloud.com/help/doc-detail/29058.htm))"
  type        = string
  default     = ""
}

// instances variables
variable "create_instance" {
  description = "Whether to create ECS instances"
  type        = bool
  default     = true
}

variable "number_of_instance" {
  description = "The number of ECS instances"
  type        = number
  default     = 1
}

variable "instance_type" {
  description = "The type of instance to start, this parameter is required if you will use this module to create instances."
  type        = string
  default     = ""
}

variable "image_id" {
  description = "The Image to use for the instance, this parameter is required if you will use this module to create instances."
  type        = string
  default     = ""
}

variable "vswitch_id" {
  description = "A existing vswitch id used to create ECS instances, this parameter is required if you will use this module to create instances."
  type        = string
  default     = ""
}

variable "security_groups" {
  description = "Existing security group ids used to create ECS instances, this parameter is required if you will use this module to create instances."
  type        = list(string)
  default     = []
}

variable "associate_public_ip_address" {
  description = "Whether to associate a public ip address with an instance in a VPC. If true, the `internet_max_bandwidth_out` should be greater than 0."
  type        = bool
  default     = false
}

variable "internet_max_bandwidth_out" {
  description = "Maximum outgoing bandwidth to the public network, measured in Mbps (Mega bit per second). Value range:  [0, 100]."
  type        = number
  default     = 10
}

variable "instance_password" {
  description = "Password to an instance is a string of 8 to 30 characters. It must contain uppercase/lowercase letters and numerals, but cannot contain special symbols. When it is changed, the instance will reboot to make the change take effect."
  type        = string
  default     = ""
}

variable "existing_instance_private_ips" {
  description = "The private IP list of existing ECS instances used to join log machine group."
  type        = list(string)
  default     = []
}


