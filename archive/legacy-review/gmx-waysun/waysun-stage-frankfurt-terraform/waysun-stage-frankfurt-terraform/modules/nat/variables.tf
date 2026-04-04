##############################################################
#variables for nat gateway
##############################################################
variable "create" {
  description = "Whether to create nat gateway. If false, you can specify an existing nat gateway by setting 'nat_gateway_id'."
  type        = bool
  default     = true
}

variable "vpc_id" {
  description = "ID of the VPC where to create nat gateway."
  type        = string
  default     = ""
}

variable "name" {
  description = "Name of a new nat gateway."
  type        = string
  default     = "terraform-alicloud-nat-gateway"
}

variable "use_existing_nat_gateway" {
  description = "Whether to create nat gateway. If false, you can specify an existing nat gateway by setting 'nat_gateway_id'."
  type        = bool
  default     = false
}

variable "existing_nat_gateway_id" {
  description = "The id of an existing nat gateway."
  type        = string
  default     = ""
}

variable "specification" {
  description = "The specification of nat gateway."
  type        = string
  default     = "Small"
}

variable "instance_charge_type" {
  description = "The charge type of the nat gateway. Choices are 'PostPaid' and 'PrePaid'."
  type        = string
  default     = "PostPaid"
}

variable "period" {
  description = "The charge duration of the PrePaid nat gateway, in month."
  type        = number
  default     = 1
}

variable "description" {
  description = "The description of nat gateway."
  type        = string
  default     = "A nat gateway create by terraform module terraform-alicloud-nat-gateway"
}

variable "region" {
  type = string
}

variable "nat_type" {
  type    = string
  default = "Enhanced"
}

variable "vswitch_id" {
  description = "Required with nat_type Enhanced"
}
