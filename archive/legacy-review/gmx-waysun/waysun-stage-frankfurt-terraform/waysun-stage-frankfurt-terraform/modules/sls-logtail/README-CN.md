Alibaba Cloud SLS Logtail Terraform Module   
terraform-alicloud-sls-logtail
=====================================================================

本 Module 用于在阿里云创建日志服务机器组及数据源ECS实例相关资源. 

本 Module 支持创建以下资源:

* [Log Machine Group](https://www.terraform.io/docs/providers/alicloud/r/log_machine_group.html)
* [Logtail Config](https://www.terraform.io/docs/providers/alicloud/r/logtail_config.html)
* [Logtail Attachment](https://www.terraform.io/docs/providers/alicloud/r/logtail_attachment.html)
* [ECS Instance](https://www.terraform.io/docs/providers/alicloud/r/instance.html)


## Terraform 版本

本模板要求使用版本 Terraform 0.12.

## 用法

```hcl
module "logtail" {
  source = "terraform-alicloud-modules/sls-logtail/alicloud"
  region = var.region
    
  #####################
  #创建SLS项目和logstore#
  #####################
  logstore_name      = "tf-sls-store"
  project_name       = "tf-sls-project"
    
  #############
  #创建机器组   #
  #############
  create_log_service        = true
  log_machine_group_name    = "log_machine_group_name"
  log_machine_identify_type = "ip"
  log_machine_topic         = "tf-module"
    
  ###############
  #创建log config#
  ###############
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
  #创建新的ECS实例#
  ##############
  create_instances   = true
  vswitch_id         = "vsw-xxxxxxxxx"
  number_of_instance = 1
  instance_type      = "ecs.g6.large"
  security_groups    = ["sg-xxxxxxxxxxxxx"]
  
  ######################################
  #通过指定已有实例的私网IP，将其加入到机器组中#
  ######################################
  existing_instance_private_ips = ["172.16.2.2", "172.16.2.3"]
}

```

## 示例

* [基本示例](https://github.com/terraform-alicloud-modules/terraform-alicloud-sls-logtail/tree/master/examples/basic)

## 注意事项

* 本 Module 使用的 AccessKey 和 SecretKey 可以直接从 `profile` 和 `shared_credentials_file` 中获取。如果未设置，可通过下载安装 [aliyun-cli](https://github.com/aliyun/aliyun-cli#installation) 后进行配置.

作者
-------
Created and maintained by Wang li(@Lexsss, 13718193219@163.com) and He Guimin(@xiaozhu36, heguimin36@163.com)

许可
----
Apache 2 Licensed. See LICENSE for full details.

参考
---------
* [Terraform-Provider-Alicloud Github](https://github.com/terraform-providers/terraform-provider-alicloud)
* [Terraform-Provider-Alicloud Release](https://releases.hashicorp.com/terraform-provider-alicloud/)
* [Terraform-Provider-Alicloud Docs](https://www.terraform.io/docs/providers/alicloud/index.html)