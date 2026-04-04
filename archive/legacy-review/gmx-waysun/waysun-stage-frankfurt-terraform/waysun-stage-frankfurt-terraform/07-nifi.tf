/*  SSH key-pair  */

module "nifi-key-pair" {
  source  = "./modules/ssh-key-pair"
  region  = var.region
  profile = var.profile

  #key pair
  key_name   = "waysun-nifi-ssh"
  public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKw8BLMZ+LKumpLvzvyAfQIUIPCar9mOOo3ZKRBW3fTh support@flipsports.com"

  #pair_attachment
  attach = false

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

/*  ECS  */

// nifi
module "nifi-1" {
  source  = "./modules/instance"
  profile = var.profile
  region  = var.region

  number_of_instances  = 1
  name                 = "${var.project_name}-${var.environment}-nifi-srv01"
  deletion_protection  = false
  use_num_suffix       = true
  image_id             = var.nifi_srv01_image_id
  instance_type        = var.nifi_srv01_instance_type
  vswitch_id           = module.vpc.this_public_vswitch_ids[0]
  private_ip           = var.nifi_srv01_private_ip
  key_name             = module.nifi-key-pair.this_key_name
  user_data            = local.nifi_user_data
  system_disk_category = var.nifi_srv01_system_disk_category
  system_disk_size     = var.nifi_srv01_system_disk_size
  instance_charge_type = "PrePaid"

  subscription = {
    period             = 3
    period_unit        = "Week"
    renewal_status     = "AutoRenewal"
    auto_renew_period  = 1
    include_data_disks = true
  }

  security_group_ids = [
    module.nifi-security-group.this_security_group_id,
  ]

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

// nifi security group 
module "nifi-security-group" {
  source      = "./modules/security-group/modules/ssh"
  profile     = var.profile
  region      = var.region
  name        = "nifi-${var.environment}-sg"
  description = "s:bastion,ansible:22;s:bastion:8080;s:bastion:ICMP;s:nifi-registry:ALL"
  vpc_id      = module.vpc.this_vpc_id

  ingress_with_source_security_group_id = [
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.ansible-security-group.this_security_group_id
    },
    {
      rule                     = "http-8080-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "all-all"
      source_security_group_id = module.nifi-registry-security-group.this_security_group_id
    },
  ]
}

/*  Disk  */

resource "alicloud_disk" "nifi-srv01-data-disk" {
  encrypted         = false
  availability_zone = "eu-central-1a" // must be static or disk will be recreated each time VM goes down
  size              = 100

  tags = {
    Name        = "${var.project_name}-${var.environment}-nifi-srv01-data-disk"
    Created     = "Terraform"
    Environment = var.environment
  }
}

resource "alicloud_disk_attachment" "nifi-srv01-data-disk-attachment" {
  disk_id     = alicloud_disk.nifi-srv01-data-disk.id
  instance_id = concat(module.nifi-1.this_instance_id, [""])[0]
  depends_on  = [module.nifi-1]
}

/*  DNS Private Records  */

resource "alicloud_pvtz_zone_record" "private_domain_record_nifi_srv01" {

  zone_id  = alicloud_pvtz_zone.waysun-priavte-zone.id
  rr       = "nifi-srv01"
  type     = "A"
  value    = concat(module.nifi-1.this_private_ip, [""])[0]
  priority = 1
}

// Manuall step - ALiCloud Support - "It's is known issue by dns cache, will been fixed in the near future"
// Fails with "errorCode": "ProjectForbidden" - PK20201127
/*  SLS */

module "nifi-sls-module" {
  source                      = "./modules/sls"
  create                      = true
  description                 = "Managed by Terraform. nifi-${var.environment}-srv01 logs"
  profile                     = var.profile
  region                      = var.region
  project_name                = "nifi-${var.environment}-srv01"
  store_name                  = "nifi-${var.environment}-srv01"
  store_retention_period      = 30
  store_shard_count           = 2
  store_auto_split            = true
  store_max_split_shard_count = 1
  store_append_meta           = true
  store_enable_web_tracking   = false
  #   index_full_text = [
  #     {
  #       case_sensitive  = false
  #       include_chinese = false
  #       token           = "#"
  #     }
  #   ]
  #   index_field_search = [
  #     {
  #       name             = "basic"
  #       type             = "long"
  #       alias            = "basic1"
  #       case_sensitive   = true
  #       include_chinese  = true
  #       token            = "#"
  #       enable_analytics = "true"
  #       json_keys = [
  #         {
  #           name      = "basic_json_key"
  #           type      = "long"
  #           alias     = "basic_json_key1"
  #           doc_value = true
  #         }
  #       ]
  #     }
  #   ]
}

/*  SLS Logtrail  */
# module "nifi-logtail" {
#   source                    = "./modules/sls-logtail"

#   profile                   = var.profile
#   region                    = var.region 
#   create_log_service        = true
#   create_instance           = false
#   logstore_name             = module.nifi-sls-module.this_log_store_name
#   project_name              = module.nifi-sls-module.this_log_project_name
#   log_machine_group_name    = "nifi"
#   log_machine_identify_type = "ip"
#   log_machine_topic         = "tf-modules"
#   config_input_type         = "file"
#   config_input_detail       = <<EOF
#                               {
#                                   "discardUnmatch": false,
#                                   "enableRawLog": true,
#                                   "fileEncoding": "utf8",
#                                   "filePattern": "*",
#                                   "logPath": "/nifi-data/logs",
#                                   "logType": "json_log",
#                                   "maxDepth": 10,
#                                   "topicFormat": "default"
#                               }
#                               EOF

# existing_instance_private_ips = [ var.nifi_srv01_private_ip ]
# }
