output "this_log_project_name" {
  description = "The name of the log project"
  value       = concat(alicloud_log_project.this.*.name, [""])[0]
}

output "this_log_store_name" {
  description = "The name of the log store"
  value       = concat(alicloud_log_store.this.*.name, [""])[0]
}

output "this_log_store_index_full_text" {
  description = "The full text of the log store index"
  value       = concat(alicloud_log_store_index.this.*.full_text, [[]])[0]
}

output "this_log_store_index_field_search" {
  description = "The field search of the log store index"
  value       = concat(alicloud_log_store_index.this.*.field_search, [[]])[0]
}