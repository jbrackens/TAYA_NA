provider "alicloud" {
  region = var.region
}

variable "region" {
  default = "cn-hangzhou"
}

variable "zone_id" {
  default = "cn-hangzhou-h"
}

##################################################################
# Data sources to get VPC, vswitch, security group and ecs image details
##################################################################

data "alicloud_vpcs" "default" {
  is_default = true
}

data "alicloud_vswitches" "default" {
  is_default = true
}

data "alicloud_instance_types" "this" {
  availability_zone = length(data.alicloud_vswitches.default.ids) > 0 ? data.alicloud_vswitches.default.vswitches.0.zone_id : var.zone_id
  cpu_core_count    = 2
  memory_size       = 4
}

data "alicloud_images" "ubuntu" {
  most_recent = true
  name_regex  = "^ubuntu_18.*64"
}
// If there is no default vswitch, create one.
resource "alicloud_vswitch" "default" {
  count             = length(data.alicloud_vswitches.default.ids) > 0 ? 0 : 1
  availability_zone = var.zone_id
  vpc_id            = data.alicloud_vpcs.default.ids.0
  cidr_block        = cidrsubnet(data.alicloud_vpcs.default.vpcs.0.cidr_block, 8, 2)
}

##################################################################
# Create a new security group used to create ecs instance
##################################################################
module "sg" {
  source              = "alibaba/security-group/alicloud"
  vpc_id              = data.alicloud_vpcs.default.ids.0
  region              = var.region
  ingress_cidr_blocks = ["0.0.0.0/0"]
  ingress_rules       = ["all-all"]
}

##################################################################
# Create log service by sls module
##################################################################
module "sls" {
  source = "terraform-alicloud-modules/sls/alicloud"
  region = var.region
}

module "logtail" {
  source                    = "../.."
  region                    = var.region
  create_log_service        = true
  logstore_name             = module.sls.this_log_store_name
  project_name              = module.sls.this_log_project_name
  log_machine_identify_type = "ip"
  log_machine_topic         = "tf-modules"
  config_input_type         = "file"
  config_input_detail       = <<EOF
                              {
                                  "discardUnmatch": false,
                                  "enableRawLog": true,
                                  "fileEncoding": "gbk",
                                  "filePattern": "access.log",
                                  "logPath": "/logPath",
                                  "logType": "json_log",
                                  "maxDepth": 10,
                                  "topicFormat": "default"
                              }
                              EOF

  create_instance    = true
  number_of_instance = 2
  instance_type      = data.alicloud_instance_types.this.ids.0
  image_id           = data.alicloud_images.ubuntu.ids.0
  security_groups    = [module.sg.this_security_group_id]
  vswitch_id         = length(data.alicloud_vswitches.default.ids) > 0 ? data.alicloud_vswitches.default.ids.0 : concat(alicloud_vswitch.default.*.id, [""])[0]
  instance_password  = "YourPassword123"
}

