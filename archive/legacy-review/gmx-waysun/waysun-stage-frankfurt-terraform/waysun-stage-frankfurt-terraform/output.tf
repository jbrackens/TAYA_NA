output "current_account_id" {
  value = data.alicloud_account.current.id
}

output "current_user_arn" {
  value = data.alicloud_caller_identity.current.id
}

output "current_region_id" {
  value = data.alicloud_regions.current_region_ds.regions.0.id
}

// ********* //
output "nat_gw_snat_table_ids" {
  value = module.nat-gateway.this_nat_gateway_snat_table_ids_str
}
output "public_vswitch_ids" {
  value = module.vpc.this_public_vswitch_ids
}
output "eip_address" {
  value = module.associate-with-nat.this_eip_address
}
