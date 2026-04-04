output "this_domain_name" {
  description = "The name of domain"
  value       = module.dns.this_domain_name
}

output "this_domain_records" {
  description = "List of the domain records"
  value       = module.dns.this_domain_records
}

output "this_group_name" {
  description = "Id of the group in which the domain will add"
  value       = module.dns.this_group_name
}

output "this_group_id" {
  description = "Name of the group in which the domain will add"
  value       = module.dns.this_group_id
}

