# This file was generated from values defined in rules.tf using update_groups.sh.
###################################
# DO NOT CHANGE THIS FILE MANUALLY
###################################

variable "auto_ingress_rules" {
  description = "List of ingress rules to add automatically"
  type        = list(string)
  default     = ["emr-kafka-schema-registry-tcp", "emr-kafka-rest-proxy-tcp", "emr-kafka-connect-tcp", "emr-kafka-metadata-tcp", "emr-kafka-manager-tcp"]
}

variable "auto_egress_rules" {
  description = "List of egress rules to add automatically"
  type        = list(string)
  default     = ["all-all"]
}


