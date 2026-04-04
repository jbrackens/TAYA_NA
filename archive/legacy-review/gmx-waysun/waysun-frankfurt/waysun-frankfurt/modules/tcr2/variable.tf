variable "availability_zone" {
  default = "eu-frankfurt-2"
}

variable "instance_name" {
  description = "Name of the Instance"
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "Type of the Instance"
  type        = string
  default     = "standard"
}

variable "instance_tags" {
  description = "Tags for the instance"
  type        = map(string)
  default     = { test = "test" }
}

variable "token_description" {
  description = "Description of the token"
  type        = string
  default     = "test"
}

variable "token_state" {
  description = "Status of the token"
  default     = false
}

variable "token_is_public" {
  description = "namespace access"
  default     = false
}

#variable "namespace_repository_map" {
#  description = "Maps repositories to namespaces."
#  type        = map(string)
#  default     = {}
#}

variable "namespace_repository_map" {
  description = "Maps repositories to namespaces."
  type        = list(list(string))
  default     = []
}

variable "repository_brief_description" {
  description = "Brief description of Repository"
  type        = string
  default     = "example"
}

variable "repository_description" {
  description = "Description of Repository"
  type        = string
  default     = "long example"
}

variable "vpc_id" {
  description = "ID of VPC"
  type        = list(string)
  default     = [""]
}

variable "vpc_name" {
  description = "Name of VPC"
  type        = string
  default     = ""
}

variable "vpc_cidr_block" {
  description = "CIDR block range of VPC"
  default     = ""
}

variable "vpc_is_multicast" {
  description = "Specify the vpc is multicast when 'vpc_id' is not specified."
  default     = true
}

variable "vpc_dns_servers" {
  description = "Specify the vpc dns servers when 'vpc_id' is not specified."
  type        = list(string)
  default     = []
}

variable "vpc_tags" {
  description = "Additional tags for the vpc."
  type        = map(string)
  default     = {}
}

variable "subnet_cidr_blocks" {
  description = "list of CIDR block ranges for individual Subnets"
  type = list(string)
  default     = ["10.0.20.0/28"]
}

variable "subnet_is_multicast" {
  description = "Specify the vpc is multicast when 'vpc_id' is not specified.t"
  default     = false
}

variable "subnet_tags" {
  description = "Additional tags for the subnet."
  type        = map(string)
  default     = {}
}

variable "subnet_id" {
  description = "ID of Subnet"
  type        = list(string)
  default     = []
}


variable "create_vpc" {
  description = "Controls if VPC should be created (it affects almost all resources)"
  default     = true
}
