Terraform module for creating key pair on Alibaba Cloud.  
terraform-alicloud-key-pair
---------------------------------------

English | [简体中文](https://github.com/terraform-alicloud-modules/terraform-alicloud-key-pair/blob/master/README-CN.md)

Terraform module which creates key pair instance on Alibaba Cloud. 

These types of resources are supported:

* [key_pair_attachment](https://www.terraform.io/docs/providers/alicloud/r/key_pair_attachment.html)
* [key_pair](https://www.terraform.io/docs/providers/alicloud/r/key_pair.html)

## Terraform versions

This module requires Terraform 0.12 and Terraform Provider AliCloud 1.66.0+.

## Usage

```hcl
module "key_pair" {
  source   = "terraform-alicloud-modules/key-pair/alicloud"
  region   = "cn-hangzhou"
  profile  = "Your-Profile-Name"

  #key pair
  key_name = "your_public_key"
  tags = {
    Created     = "Terraform"
    Environment = "dev"
  }

  #pair_attachment
  instance_ids  =["i-bp17i59h2ixwmsxxxxxxx"]
}
```

## Examples

* [complete](https://github.com/terraform-alicloud-modules/terraform-alicloud-key-pair/tree/master/examples/complete)

## Notes

* This module using AccessKey and SecretKey are from `profile` and `shared_credentials_file`.
If you have not set them yet, please install [aliyun-cli](https://github.com/aliyun/aliyun-cli#installation) and configure it.

Submit Issues
-------------
If you have any problems when using this module, please opening a [provider issue](https://github.com/terraform-providers/terraform-provider-alicloud/issues/new) and let us know.

**Note:** There does not recommend to open an issue on this repo.

Authors
-------
Created and maintained by He Guimin(@xiaozhu36, heguimin36@163.com) and Yi Jincheng(yi785301535@163.com) 

License
----
Apache 2 Licensed. See LICENSE for full details.

Reference
---------
* [Terraform-Provider-Alicloud Github](https://github.com/terraform-providers/terraform-provider-alicloud)
* [Terraform-Provider-Alicloud Release](https://releases.hashicorp.com/terraform-provider-alicloud/)
* [Terraform-Provider-Alicloud Docs](https://www.terraform.io/docs/providers/alicloud/index.html)
