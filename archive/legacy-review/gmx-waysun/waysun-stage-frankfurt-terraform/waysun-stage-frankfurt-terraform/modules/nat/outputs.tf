output "this_nat_gateway_id" {
  description = "The nat gateway id."
  value       = alicloud_nat_gateway.this[*].id
}

output "this_nat_gateway_snat_table_ids" {
  description = "The nat gateway snat_table_ids" 
  value       = alicloud_nat_gateway.this[*].snat_table_ids
}

output "this_nat_gateway_snat_table_ids_str" {
  description = "The nat gateway snat_table_ids as string" 
  value       = concat(alicloud_nat_gateway.this.*.snat_table_ids, [""])[0]
}