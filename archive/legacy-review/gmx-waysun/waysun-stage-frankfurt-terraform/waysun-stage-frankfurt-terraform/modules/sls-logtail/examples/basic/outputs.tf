output "this_log_project_name" {
  description = "The name of the log project"
  value       = module.logtail.this_log_project_name
}

output "this_log_store_name" {
  description = "The name of the log store"
  value       = module.logtail.this_log_store_name
}

output "this_log_machine_group_name" {
  description = "The name of the log machine group"
  value       = module.logtail.this_log_machine_group_name
}

output "this_log_machine_group_identify_type" {
  description = "The identify type of the log machine group"
  value       = module.logtail.this_log_machine_group_identify_type
}

output "this_log_machine_group_topic" {
  description = "The topic of the log machine group"
  value       = module.logtail.this_log_machine_group_topic
}

output "this_log_machine_group_identify_list" {
  description = "The identify list of the log machine group"
  value       = module.logtail.this_log_machine_group_identify_list
}

output "this_logtail_config_name" {
  description = "The name of the logtail config"
  value       = module.logtail.this_logtail_config_name
}

output "this_logtail_config_input_type" {
  description = "The input type of the logtail config"
  value       = module.logtail.this_logtail_config_input_type
}

output "this_logtail_config_log_sample" {
  description = "The log sample of the logtail config"
  value       = module.logtail.this_logtail_config_log_sample
}

output "this_logtail_config_input_detail" {
  description = "The input detail of the logtail config"
  value       = module.logtail.this_logtail_config_input_detail
}

output "this_instance_id" {
  description = "The Id of instances created by this module"
  value       = module.logtail.this_instance_id
}

output "this_instance_name" {
  description = "The name of instances created by this module"
  value       = module.logtail.this_instance_name
}
