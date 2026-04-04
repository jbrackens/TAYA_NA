Alibaba Cloud SLS Terraform Module   
terraform-alicloud-sls
=====================================================================

本 Module 用于在阿里云创建一套日志服务相关资源. 

本 Module 支持创建以下资源:

* [Log Project](https://www.terraform.io/docs/providers/alicloud/r/log_project.html)
* [Log Store](https://www.terraform.io/docs/providers/alicloud/r/log_store.html)
* [Log Store_index](https://www.terraform.io/docs/providers/alicloud/r/log_store_index.html)


## Terraform 版本

本模板要求使用版本 Terraform 0.12.

## 用法

```hcl

module "sls-module" {
  source                      = "terraform-alicloud-modules/sls/alicloud"
  create                      = true
  
  #############
  #log project#
  #############
  project_prefix              = "basic-project-name"
  
  ###########
  #log store#
  ###########
  store_name                  = "basic-store-name"
  store_retention_period      = 30
  store_shard_count           = 2
  store_auto_split            = true
  store_max_split_shard_count = 1
  store_append_meta           = true
  store_enable_web_tracking   = false
  
  #################
  #log store index#
  #################
  index_full_text = [
    {
      case_sensitive  = false
      include_chinese = false
      token           = "#"
    }
  ]
  index_field_search = [
    {
      name             = "basic"
      type             = "long"
      alias            = "basic1"
      case_sensitive   = true
      include_chinese  = true
      token            = "#"
      enable_analytics = "true"
      json_keys = [
        {
          name      = "basic_json_key"
          type      = "long"
          alias     = "basic_json_key1"
          doc_value = true
        }
      ]
    }
  ]
}
```

## 示例

* [基本示例](https://github.com/terraform-alicloud-modules/terraform-alicloud-sls/tree/master/examples/basic)

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