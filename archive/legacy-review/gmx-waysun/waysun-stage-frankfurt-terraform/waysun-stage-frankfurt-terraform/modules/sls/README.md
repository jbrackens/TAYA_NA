Alibaba Cloud SLS Terraform Module   
terraform-alicloud-sls
=====================================================================

English | [简体中文](https://github.com/terraform-alicloud-modules/terraform-alicloud-sls/blob/master/README-CN.md)

Terraform module which creates log service's resources (SLS) on Alibaba Cloud.

These types of resources are supported:

* [Log Project](https://www.terraform.io/docs/providers/alicloud/r/log_project.html)
* [Log Store](https://www.terraform.io/docs/providers/alicloud/r/log_store.html)
* [Log Store_index](https://www.terraform.io/docs/providers/alicloud/r/log_store_index.html)


## Terraform versions

This module requires Terraform 0.12.

## Usage

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

## Examples

* [Basic example](https://github.com/terraform-alicloud-modules/terraform-alicloud-sls/tree/master/examples/basic)

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