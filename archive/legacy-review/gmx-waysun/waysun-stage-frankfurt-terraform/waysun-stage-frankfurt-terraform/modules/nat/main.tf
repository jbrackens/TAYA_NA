resource "alicloud_nat_gateway" "this" {
  count         = var.use_existing_nat_gateway ? 0 : var.create ? 1 : 0
  vpc_id        = var.vpc_id
  name          = var.name
  specification = var.specification
  description   = "A Nat Gateway created by Terraform"

  instance_charge_type = var.instance_charge_type
  period               = var.period
  nat_type             = var.nat_type
  vswitch_id           = var.vswitch_id
}



