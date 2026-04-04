output "this_log_project_name" {
  description = "The name of the log project"
  value       = module.basic-sls-module.this_log_project_name
}

output "this_log_store_name" {
  description = "The name of the log store"
  value       = module.basic-sls-module.this_log_store_name
}

output "this_log_store_index_full_text" {
  description = "The full text of the log store index"
  value       = module.basic-sls-module.this_log_store_index_full_text
}

output "this_log_store_index_field_search" {
  description = "The field search of the log store index"
  value       = module.basic-sls-module.this_log_store_index_field_search
}