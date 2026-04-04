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

variable "description" {
  type        = string
  default     = "Created by modules/terraform-alicloud-sls"
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

variable "create" {
  description = "Whether to create log resources"
  type        = string
  default     = true
}

variable "project_name" {
  description = "Log project name. If not set, a default name with prefix `sls-module-project-` will be returned."
  type        = string
  default     = ""
}

variable "use_random_suffix" {
  description = "Whether to add a suffix for project name"
  type        = bool
  default     = true
}

variable "store_name" {
  description = "Log store name. If not set, a default name with prefix `sls-module-store-` will be returned."
  type        = string
  default     = ""
}

variable "store_retention_period" {
  description = "The data retention time (in days). Valid values: [1-3650]. Default to 30. Log store data will be stored permanently when the value is '3650'."
  type        = number
  default     = 30
}

variable "store_shard_count" {
  description = "The number of shards in this log store. Default to 2. You can modify it by 'Split' or 'Merge' operations."
  type        = number
  default     = 2
}

variable "store_auto_split" {
  description = "Determines whether to automatically split a shard. Default to true."
  type        = bool
  default     = true
}

variable "store_max_split_shard_count" {
  description = "The maximum number of shards for automatic split, which is in the range of 1 to 64. You must specify this parameter when autoSplit is true."
  type        = number
  default     = 1
}

variable "store_append_meta" {
  description = "Determines whether to append log meta automatically. The meta includes log receive time and client IP address. Default to true."
  type        = bool
  default     = true
}

variable "store_enable_web_tracking" {
  description = "Determines whether to enable Web Tracking. Default false."
  type        = bool
  default     = false
}

variable "index_full_text" {
  description = "The configuration of full text index."
  type        = set(map(string))
  default = [
    {
      // Whether the case sensitive. Default to false.
      case_sensitive = false
      // Whether includes the chinese. Default to false.
      include_chinese = false
      // The string of several split words, like "\r", "#"
      token = "#"
    }
  ]
}

variable "index_field_search" {
  description = "List configurations of field search index."
  type = set(object({
    // The field name, which is unique in the same log store.
    name = string
    // The type of one field. Valid values: ["long", "text", "double", "json"]. Default to "long".
    type = string
    // The alias of one field
    alias = string
    // Whether the case sensitive for the field. Default to false. It is valid when "type" is "text" or "json".
    case_sensitive = bool
    // Whether includes the chinese for the field. Default to false. It is valid when "type" is "text" or "json".
    include_chinese = bool
    // The string of several split words, like "\r", "#". It is valid when "type" is "text" or "json".
    token = string
    // Whether to enable field analytics. Default to true.
    enable_analytics = bool
    // Use nested index when type is json
    json_keys = list(object({
      // When using the json_keys field, this field is required.
      name = string
      // The type of one field. Valid values: ["long", "text", "double"]. Default to "long"
      type = string
      // The alias of one field.
      alias = string
      // Whether to enable statistics. default to true.
      doc_value = bool
    }))
  }))
  default = []
}