/*  VPC   */

variable "profile" { default = "waysun-stage" }
variable "region" { default = "eu-central-1" }
variable "vpc_cidr" { default = "10.2.0.0/16" }
variable "environment" { default = "stage" }
variable "project_name" { default = "waysun" }
variable "resource_group_id" { default = "rg-waysun-stage-001" }
variable "domain_name" { default = "zolbass.waysuninc.cn" }
variable "eip_bandwidth" { default = 8 } //Mbps

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.2.0.0/23", "10.2.4.0/23"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.2.8.0/23", "10.2.12.0/23"]
}

variable "availability_zones" {
  type    = list(string)
  default = ["eu-central-1a", "eu-central-1b"]
}

/*  Sub-project Names  */

variable "nifi_subproject_name" { default = "nifi" }
variable "nifi_registry_subproject_name" { default = "nifi-registry" }

/*  OSS  */

//backend
// variable "backend_bucket_name"                              { default = "waysun-prod-r-oss" }
// variable "backend_bucket_policy"                            { default = "private" }
// variable "backend_bucket_encrypt"                           { default = true }

//logs
variable "logs_bucket_name" { default = "waysun-stage-logs" }
variable "logs_bucket_policy" { default = "private" }

//oidc
// variable "oidc_bucket_name"                                 { default = "waysun-prod-oidc"}
// variable "oidc_bucket_policy"                               { default = "private" }

/*  RDS  */

variable "rds_instance_type" { default = "pg.n2.small.1" }
variable "rds_engine" { default = "PostgreSQL" }
variable "rds_engine_version" { default = "10.0" }
variable "rds_instance_storage" { default = 100 }
variable "rds_public" { default = false }
variable "rds_backup_time" { default = "00:00Z-01:00Z" }
variable "rds_backup_retention" { default = 7 }
variable "rds_log_backup_retention" { default = 7 }
variable "rds_create_account" { default = true }
variable "rds_privilege" { default = "ReadWrite" }
variable "rds_create_database" { default = true }
variable "rds_port" { default = "5432" }

variable "rds_backup_period" {
  default = ["Monday", "Wednesday"]
  type    = list(string)
}

/*  Redis  */

variable "redis_instance_class" { default = "redis.master.small.default" } // mid
variable "redis_engine" { default = "Redis" }
variable "redis_engine_version" { default = "5.0" }
variable "redis_backup_time" { default = "00:00Z-01:00Z" }

variable "redis_backup_period" {
  default = ["Monday", "Wednesday", "Friday"]
  type    = list(string)
}

/*   ECS   */

variable "allowed_external_ip" {
  type    = list(string)
  default = ["212.250.151.149/32", "54.194.105.187/32"] // fw02-lon, mekong-fw
}

//bastion
variable "bastion_private_ip" { default = "10.2.0.170" }
variable "bastion_image_id" { default = "ubuntu_18_04_64_20G_alibase_20190624.vhd" }
variable "bastion_instance_type" { default = "ecs.xn4.small" }
variable "bastion_system_disk_category" { default = "cloud_ssd" }
variable "bastion_system_disk_size" { default = "40" }

//nifi-srv01
variable "nifi_srv01_private_ip" { default = "10.2.0.110" }
variable "nifi_srv01_image_id" { default = "ubuntu_18_04_64_20G_alibase_20190624.vhd" }
variable "nifi_srv01_instance_type" { default = "ecs.t6-c1m1.large" }
variable "nifi_srv01_system_disk_category" { default = "cloud_ssd" }
variable "nifi_srv01_system_disk_size" { default = "40" }

//ansible-srv01
variable "ansible_srv01_private_ip" { default = "10.2.0.99" }
variable "ansible_srv01_image_id" { default = "ubuntu_18_04_64_20G_alibase_20190624.vhd" }
variable "ansible_srv01_instance_type" { default = "ecs.xn4.small" }
variable "ansible_srv01_system_disk_category" { default = "cloud_ssd" }
variable "ansible_srv01_system_disk_size" { default = "20" }


//nifi-registry
variable "nifi_registry_private_ip" { default = "10.2.0.120" }
variable "nifi_registry_image_id" { default = "ubuntu_18_04_64_20G_alibase_20190624.vhd" }
variable "nifi_registry_instance_type" { default = "ecs.t6-c1m1.large" }
variable "nifi_registry_system_disk_category" { default = "cloud_ssd" }
variable "nifi_registry_system_disk_size" { default = "40" }

//openvpn
variable "openvpn_private_ip" { default = "10.2.4.99" }
variable "openvpn_image_id" { default = "ubuntu_18_04_64_20G_alibase_20190624.vhd" }
variable "openvpn_instance_type" { default = "ecs.xn4.small" }
variable "openvpn_system_disk_category" { default = "cloud_ssd" }
variable "openvpn_system_disk_size" { default = "40" }

/*   ASG   */

//test-asg
variable "test_asg_image_id" { default = "ubuntu_18_04_64_20G_alibase_20190624.vhd" }
variable "test_asg_instance_type" { default = "ecs.xn4.small" }

/*  Container repository  */

//general
variable "general_repo_type" { default = "PRIVATE" }
variable "general_repo_detail" { default = "private repo" }

