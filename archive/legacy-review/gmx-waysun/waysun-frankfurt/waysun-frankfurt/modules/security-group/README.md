# TencentCloud SecurityGroup Module for Terraform

## terraform-tencentcloud-security-group

A terraform module used to create TencentCloud security group and rule.

The following resources are included.

* [SecurityGroup](https://www.terraform.io/docs/providers/tencentcloud/r/security_group.html)
* [SecurityGroup Rule](https://www.terraform.io/docs/providers/tencentcloud/r/security_group_rule.html)

## Usage

```hcl
module "security_group" {
  source  = "terraform-tencentcloud-modules/security-group/tencentcloud"
  version = "1.0.3"

  security_group_name        = "simple-security-group"
  security_group_description = "simple-security-group-test"

  ingress_with_cidr_blocks = [
    {
      cidr_block = "10.0.0.0/16"
    },
    {
      port       = "80"
      cidr_block = "10.1.0.0/16"
    },
    {
      port       = "808"
      cidr_block = "10.2.0.0/16"
      policy     = "drop"
    },
    {
      port       = "8088"
      protocol   = "UDP"
      cidr_block = "10.3.0.0/16"
      policy     = "accept"
    },
    {
      port        = "8080-9090"
      protocol    = "TCP"
      cidr_block  = "10.4.0.0/16"
      policy      = "accept"
      description = "simple-security-group"
    },
  ]

  egress_with_cidr_blocks = [
    {
      cidr_block = "10.0.0.0/16"
    },
    {
      port        = "8080-9090"
      protocol    = "TCP"
      cidr_block  = "10.4.0.0/16"
      policy      = "accept"
      description = "simple-security-group"
    },
  ]

  ingress_with_source_sgids = [
    {
      source_sgid = "sg-123456"
    },
    {
      port        = "8080-9090"
      protocol    = "TCP"
      source_sgid = "sg-123456"
      policy      = "accept"
      description = "simple-security-group"
    },
  ]

  egress_with_source_sgids = [
    {
      source_sgid = "sg-123456"
    },
    {
      port        = "8080-9090"
      protocol    = "TCP"
      source_sgid = "sg-123456"
      policy      = "accept"
      description = "simple-security-group"
    },
  ]

  tags = {
    module = "security-group"
  }

  security_group_tags = {
    test = "security-group"
  }
}
```

## Conditional Creation

This module can create security group and rule.
It is possible to use existing security group when specify `security_group_id` parameter.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|:----:|:-----:|:-----:|
| tags | A map of tags to add to all resources. | map(string) | {} | no
| security_group_id | The security group id id used to launch resources. | string | "" | no
| security_group_name | The security group name used to launch a new security group when `security_group_id` is not specified. | string | tf-modules-sg | no
| security_group_description | The description used to launch a new security group when `security_group_id` is not specified. | string | "" | no
| security_group_tags | Additional tags for the security group. | map(string) | {} | no
| ingress_with_cidr_blocks | List of ingress rules to create where `cidr_block` is used. | list(map(string)) | [] | no
| egress_with_cidr_blocks | List of egress rules to create where `cidr_block` is used. | list(map(string)) | [] | no
| ingress_with_source_sgids | List of ingress rules to create where `source_sgid` is used. | list(map(string)) | [] | no
| egress_with_source_sgids | List of egress rules to create where `source_sgid` is used. | list(map(string)) | [] | no

### ingress_with_cidr_blocks and egress_with_cidr_blocks

`ingress_with_cidr_blocks` and `egress_with_cidr_blocks` is a list of security group maps where `cidr_block` is used, the folling name are defined.

| Name | Description | Type | Default | Required |
|------|-------------|:----:|:-----:|:-----:|
| cidr_block | An IP address network or segment | string | "" | yes
| protocol | Type of ip protocol, the available value include TCP, UDP and ICMP. | string | "TCP" | no
| port | Range of the port. The available value can be one, multiple or one segment. E.g. 80, 80,90 and 80-90. Default to all ports. | string | "ALL" | no
| policy | Rule policy of security group, the available value include ACCEPT and DROP. | string | "ACCEPT" | no
| description | Description of the security group rule. | string | "" | no

### ingress_with_source_sgids and egress_with_source_sgids

`ingress_with_source_sgids` and `egress_with_source_sgids` is a list of security group maps where `source_sgid` is used, the folling name are defined.

| Name | Description | Type | Default | Required |
|------|-------------|:----:|:-----:|:-----:|
| source_sgid | ID of the nested security group | string | "" | yes
| protocol | Type of ip protocol, the available value include TCP, UDP and ICMP. | string | "TCP" | no
| port | Range of the port. The available value can be one, multiple or one segment. E.g. 80, 80,90 and 80-90. Default to all ports. | string | "ALL" | no
| policy | Rule policy of security group, the available value include ACCEPT and DROP. | string | "ACCEPT" | no
| description | Description of the security group rule. | string | "" | no

## Outputs

| Name | Description |
|------|-------------|
| security_group_id | The id of security group. |
| security_group_name | The name of security group. |
| security_group_description | The description of security group. |

## Authors

Created and maintained by [TencentCloud](https://github.com/terraform-providers/terraform-provider-tencentcloud)

## License

Mozilla Public License Version 2.0.
See LICENSE for full details.
