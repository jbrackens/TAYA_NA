terraform-alicloud-key-pair
=====================================================================

本 Terraform 模块将用于在阿里云上创建密钥对。

本 Module 支持创建以下资源:

* [key_pair_attachment](https://www.terraform.io/docs/providers/alicloud/r/key_pair_attachment.html)
* [key_pair](https://www.terraform.io/docs/providers/alicloud/r/key_pair.html)

## Terraform 版本

本模板要求使用版本 Terraform 0.12 和 阿里云 Provider 1.66.0+。

## 用法

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

## 示例

* [complete](https://github.com/terraform-alicloud-modules/terraform-alicloud-key-pair/tree/master/examples/complete)

## 注意事项

* 本 Module 使用的 AccessKey 和 SecretKey 可以直接从 `profile` 和 `shared_credentials_file` 中获取。如果未设置，可通过下载安装 [aliyun-cli](https://github.com/aliyun/aliyun-cli#installation) 后进行配置。

提交问题
------
如果在使用该 Terraform Module 的过程中有任何问题，可以直接创建一个 [Provider Issue](https://github.com/terraform-providers/terraform-provider-alicloud/issues/new)，我们将根据问题描述提供解决方案。

**注意:** 不建议在该 Module 仓库中直接提交 Issue。

作者
-------
Created and maintained by Yi Jincheng(yi785301535@163.com) and He Guimin(@xiaozhu36, heguimin36@163.com)

许可
----
Apache 2 Licensed. See LICENSE for full details.

参考
---------
* [Terraform-Provider-Alicloud Github](https://github.com/terraform-providers/terraform-provider-alicloud)
* [Terraform-Provider-Alicloud Release](https://releases.hashicorp.com/terraform-provider-alicloud/)
* [Terraform-Provider-Alicloud Docs](https://www.terraform.io/docs/providers/alicloud/index.html)
