Alibaba Cloud SLS Logtail Terraform Module   
terraform-alicloud-sls-logtail
=====================================================================

English | [简体中文](https://github.com/terraform-alicloud-modules/terraform-alicloud-sls-logtail/blob/master/README-CN.md)

Terraform module which creates sls logtail resources on Alibaba Cloud.

These types of resources are supported:

* [Log Machine Group](https://www.terraform.io/docs/providers/alicloud/r/log_machine_group.html)
* [Logtail Config](https://www.terraform.io/docs/providers/alicloud/r/logtail_config.html)
* [Logtail Attachment](https://www.terraform.io/docs/providers/alicloud/r/logtail_attachment.html)
* [ECS Instance](https://www.terraform.io/docs/providers/alicloud/r/instance.html)


## Terraform versions

This module requires Terraform 0.12.

## Usage

```hcl
module "logtail" {
  source = "terraform-alicloud-modules/sls-logtail/alicloud"
  region = var.region
    
  #####
  #SLS#
  #####
  create_log_service = true
  logstore_name      = "tf-sls-store"
  project_name       = "tf-sls-project"
    
  #############
  #log machine#
  #############
  create_log_service        = true
  log_machine_group_name    = "log_machine_group_name"
  log_machine_identify_type = "ip"
  log_machine_topic         = "tf-module"
    
  ############
  #log config#
  ############
  config_name               = "config_name"
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
    
  ##############
  #ecs instance#
  ##############
  create_instances   = true
  vswitch_id         = "vsw-xxxxxxxxx"
  number_of_instance = 1
  instance_type      = "ecs.g6.large"
  security_groups    = ["sg-xxxxxxxxxxxxx"]
  
  ################################################################
  #setting existing ecs instance private ip to join machine group#
  ################################################################
  existing_instance_private_ips = ["172.16.2.2", "172.16.2.3"]
}

```

## Examples

* [Basic example](https://github.com/terraform-alicloud-modules/terraform-alicloud-sls-logtail/tree/master/examples/basic)

## Notes

* This module using AccessKey and SecretKey are from `profile` and `shared_credentials_file`.
If you have not set them yet, please install [aliyun-cli](https://github.com/aliyun/aliyun-cli#installation) and configure it.

Authors
-------
Created and maintained by Wang li(@Lexsss, 13718193219@163.com) and He Guimin(@xiaozhu36, heguimin36@163.com)

License
----
Apache 2 Licensed. See LICENSE for full details.

Reference
---------
* [Terraform-Provider-Alicloud Github](https://github.com/terraform-providers/terraform-provider-alicloud)
* [Terraform-Provider-Alicloud Release](https://releases.hashicorp.com/terraform-provider-alicloud/)
* [Terraform-Provider-Alicloud Docs](https://www.terraform.io/docs/providers/alicloud/index.html)