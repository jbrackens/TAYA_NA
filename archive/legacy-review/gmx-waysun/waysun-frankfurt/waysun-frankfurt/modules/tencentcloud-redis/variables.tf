variable "availability_zone" {
  # default = "ap-guangzhou-3"
}

variable "redis_type" {
  description = "Type of redis instance (DEPRECATED)"
  type        = string
  default     = "master_slave_redis"
}

variable "redis_password" {
  description = "Password of the redis instance"
  # default     = "test12345789"
}

variable "redis_mem_size" {
  description = "Memory size of the redis instance"
  default     = 8192
}

variable "redis_type_id" {
  description = "The type of instance to create based on AZs"
  default     = 2
}

variable "redis_names" {
  description = "Name of the redis instance"
  type        = list(string)
  # default     = ["terraform_test", "terrform_prepaid_test"]
}

variable "redis_port" {
  description = "Port of the redis instance"
  #leave
  default     = "6379"
}

variable "redis_tags" {
  description = "Tags for the Redis instance"
  type        = list(map(string))
  default     = [
    { 
      "test" = "test" 
    },
    {
      "test" = "prepaid test"
    }
    ]
}

variable "redis_backup_time" {
  description = "Time to backup the Redis instance"
  type        = string
  default     = "01:00-02:00"
}

variable "redis_charge_type" {
  description = "Charge type of redis instance. Default is POSTPAID"
  type        = list(string)
  # default     = ["POSTPAID", "PREPAID"]
}

variable "redis_prepaid_period" {
  description = "Tenancy of prepaid instance. Works for only POSTPAID instances. Valid values are 1,2,3,4,5,6,7,8,9,10,11,12,24,36"
  # default     = 1
}

variable "redis_force_delete" {
  description = "Delete instance from Recycle bin. Works for only POSTPAID instances."
  default     = false
}

variable "redis_backup_period" {
  description = "Days to run Redis instance backup"
  type        = list(string)
  # default     = ["Saturday", "Sunday"]
}

variable "redis_shard_num"{
  default = 1
}

variable "redis_replicas_num" {
  default = 1
}

variable "project_id" {
  default = 0
}

variable "vpc_id" {
  default = ""
  type = string
}
variable "subnet_id" {
  default = ""
  type = string
}