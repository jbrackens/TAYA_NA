# SecurityGroup Module Example

This module will create a new SecurityGroup and Rules.

## Usage

To run this example, you need first replace the configuration like `security_group_name`, `ingress_with_cidr_blocks` etc, and then execute:

```bash
$ terraform init
$ terraform plan
$ terraform apply
```

Note, this example may create resources which cost money. Run `terraform destroy` if you don't need these resources.

## Outputs

| Name | Description |
|------|-------------|
| security_group_id  | The id of security group. |