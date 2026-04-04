/* General variables */

variable "region" {
  description = "The region used to launch this module resources."
  type        = string
  default     = ""
}
variable "environment" {
  description = "Environment"
  type        = string
  default     = ""
}
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = ""
}
variable "description" {
  type        = string
  default     = "Managed by Terraform"
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

/*  VPC variables  */

variable "create" {
  description = "Whether to create vpc. If false, you can specify an existing vpc by setting 'vpc_id'."
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "The vpc id used to launch several vswitches. If set, the 'create' will be ignored."
  type        = string
  default     = ""
}

variable "vpc_name" {
  description = "The vpc name used to launch a new vpc."
  type        = string
  default     = "TF-VPC"
}

variable "vpc_description" {
  description = "The vpc description used to launch a new vpc."
  type        = string
  default     = "Terrafrom managed!!!"
}

variable "vpc_cidr" {
  description = "The cidr block used to launch a new vpc."
  type        = string
  default     = "172.16.0.0/12"
}

variable "resource_group_id" {
  description = "The Id of resource group which the instance belongs."
  type        = string
  default     = ""
}

variable "vpc_name_regex" {
  description = "(Deprecated) It has been deprecated from 1.5.0."
  type        = string
  default     = ""
}

variable "vpc_tags" {
  description = "The tags used to launch a new vpc. Before 1.5.0, it used to retrieve existing VPC."
  type        = map(string)
  default     = {}
}

/*  VSwitch variables  */

variable "vswitch_public_cidrs" {
  description = "List of cidr blocks used to launch several new vswitches. If not set, there is no new vswitches will be created."
  type        = list(string)
  default     = []
}

variable "vswitch_private_cidrs" {
  description = "List of cidr blocks used to launch several new vswitches. If not set, there is no new vswitches will be created."
  type        = list(string)
  default     = []
}

variable "availability_zones" {
  description = "List available zones to launch several VSwitches."
  type        = list(string)
  default     = []
}

variable "vswitch_public_name" {
  description = "The vswitch name prefix used to launch several new public vswitches."
  default     = "public-VSwitch"
}

variable "vswitch_private_name" {
  description = "The vswitch name prefix used to launch several new private vswitches."
  default     = "private-VSwitch"
}

variable "use_num_suffix" {
  description = "Always append numerical suffix(like 001, 002 and so on) to vswitch name, even if the length of `vswitch_cidrs` is 1"
  type        = bool
  default     = false
}

variable "vswitch_tags" {
  description = "The tags used to launch serveral vswitches."
  type        = map(string)
  default     = {}
}

// According to the vswitch cidr blocks to launch several vswitches
variable "destination_cidrs" {
  description = "List of destination CIDR block of virtual router in the specified VPC."
  type        = list(string)
  default     = []
}

variable "nexthop_ids" {
  description = "List of next hop instance IDs of virtual router in the specified VPC."
  type        = list(string)
  default     = []
}

/*  NAT gateway   */

variable "create_nat" {
  description = "Whether to create nat gateway."
  type        = bool
  default     = true
}

variable "nat_name" {
  description = "Name of a new nat gateway."
  type        = string
  default     = "nat"
}

variable "nat_number" {
  description = "How many NAT gateways do you need"
  type        = number
  default     = 1
}

variable "nat_specification" {
  description = "The specification of nat gateway."
  type        = string
  default     = "Small"
}

variable "nat_instance_charge_type" {
  description = "The charge type of the nat gateway. Choices are 'PostPaid' and 'PrePaid'."
  type        = string
  default     = "PostPaid"
}

variable "nat_period" {
  description = "The charge duration of the PrePaid nat gateway, in month."
  type        = number
  default     = 1
}

/*  common bandwodth package  */

variable "cbp_bandwidth" {
  description = "The bandwidth of the common bandwidth package, in Mbps."
  type        = number
  default     = 10
}

variable "cbp_internet_charge_type" {
  description = "The billing method of the common bandwidth package. Valid values are 'PayByBandwidth' and 'PayBy95' and 'PayByTraffic'. 'PayBy95' is pay by classic 95th percentile pricing. International Account doesn't supports 'PayByBandwidth' and 'PayBy95'. Default to 'PayByTraffic'."
  type        = string
  default     = "PayByTraffic"
}

variable "cbp_ratio" {
  description = "Ratio of the common bandwidth package."
  type        = string
  default     = 100
}

/*  EIP  */

variable "create_eip" {
  description = "Whether to create new EIP and bind it to this Nat gateway. If true, the 'number_of_dnat_eip' or 'number_of_snat_eip' should not be empty."
  type        = bool
  default     = false
}
variable "number_of_dnat_eip" {
  description = "Number of EIP instance used to bind with this Dnat."
  type        = number
  default     = 0
}
variable "number_of_snat_eip" {
  description = "Number of EIP instance used to bind with this Snat."
  type        = number
  default     = 0
}
variable "eip_name" {
  description = "Name to be used on all eip as prefix. Default to 'TF-EIP-for-Nat'. The final default name would be TF-EIP-for-Nat001, TF-EIP-for-Nat002 and so on."
  type        = string
  default     = "tf-module-network-with-nat"
}

variable "eip_bandwidth" {
  description = "Maximum bandwidth to the elastic public network, measured in Mbps (Mega bit per second)."
  type        = number
  default     = 5
}

variable "eip_internet_charge_type" {
  description = "Internet charge type of the EIP, Valid values are 'PayByBandwidth', 'PayByTraffic'. "
  type        = string
  default     = "PayByTraffic"
}

variable "eip_instance_charge_type" {
  description = "Elastic IP instance charge type."
  type        = string
  default     = "PostPaid"
}

variable "eip_period" {
  description = "The duration that you will buy the EIP, in month."
  type        = number
  default     = 1
}

variable "eip_tags" {
  description = "A mapping of tags to assign to the EIP instance resource."
  type        = map(string)
  default     = {}
}

variable "eip_isp" {
  description = "The line type of the Elastic IP instance."
  type        = string
  default     = ""
}

/* SNAT */

variable "create_snat" {
  description = "Whether to create snat entries. If true, the 'snat_with_source_cidrs' or 'snat_with_vswitch_ids' or 'snat_with_instance_ids' should be set."
  type        = bool
  default     = false
}

variable "snat_ips" {
  description = "The public ip addresses to use on all snat entries."
  type        = list(string)
  default     = []
}

variable "snat_with_source_cidrs" {
  description = "List of snat entries to create by cidr blocks. Each item valid keys: 'source_cidrs'(required, using comma joinor to set multi cidrs), 'snat_ip'(if not, use root parameter 'snat_ips', using comma joinor to set multi ips), 'name'(if not, will return one automatically)."
  type        = list(map(string))
  default     = []
}

variable "snat_with_vswitch_ids" {
  description = "List of snat entries to create by vswitch ids. Each item valid keys: 'vswitch_ids'(required, using comma joinor to set multi vswitch ids), 'snat_ip'(if not, use root parameter 'snat_ips', using comma joinor to set multi ips), 'name'(if not, will return one automatically)."
  type        = list(map(string))
  default     = []
}

variable "snat_with_instance_ids" {
  description = "List of snat entries to create by ecs instance ids. Each item valid keys: 'instance_ids'(required, using comma joinor to set multi instance ids), 'snat_ip'(if not, use root parameter 'snat_ips', using comma joinor to set multi ips), 'name'(if not, will return one automatically)."
  type        = list(map(string))
  default     = []
}

variable "computed_snat_with_source_cidr" {
  description = "List of computed snat entries to create by cidr blocks. Each item valid keys: 'source_cidr'(required), 'snat_ip'(if not, use root parameter 'snat_ips', using comma joinor to set multi ips), 'name'(if not, will return one automatically)."
  type        = list(map(string))
  default     = []
}

variable "computed_snat_with_vswitch_id" {
  description = "List of computed snat entries to create by vswitch ids. Each item valid keys: 'vswitch_id'(required), 'snat_ip'(if not, use root parameter 'snat_ips', using comma joinor to set multi ips), 'name'(if not, will return one automatically)."
  type        = list(map(string))
  default     = []
}


/*  DNAT  */

variable "create_dnat" {
  description = "Whether to create dnat entries. If true, the 'entries' should be set."
  type        = bool
  default     = false
}

variable "dnat_entries" {
  description = "A list of entries to create. Each item valid keys: 'name'(default to a string with prefix 'tf-dnat-entry' and numerical suffix), 'ip_protocol'(default to 'any'), 'external_ip'(if not, use root parameter 'external_ip'), 'external_port'(default to 'any'), 'internal_ip'(required), 'internal_port'(default to the 'external_port')."
  type        = list(map(string))
  default     = []
}

variable "dnat_external_ip" {
  description = "The public ip address to use on all dnat entries."
  type        = string
  default     = ""
}





