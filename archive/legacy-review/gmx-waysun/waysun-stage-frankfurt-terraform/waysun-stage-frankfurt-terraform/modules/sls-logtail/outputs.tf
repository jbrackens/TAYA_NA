output "this_log_project_name" {
  description = "The name of the log project"
  value       = concat(alicloud_logtail_config.this.*.project, [""])[0]
}

output "this_log_store_name" {
  description = "The name of the log store"
  value       = concat(alicloud_logtail_config.this.*.logstore, [""])[0]
}

output "this_log_machine_group_name" {
  description = "The name of the log machine group"
  value       = concat(alicloud_log_machine_group.this.*.name, [""])[0]
}

output "this_log_machine_group_identify_type" {
  description = "The identify type of the log machine group"
  value       = concat(alicloud_log_machine_group.this.*.identify_type, [""])[0]
}

output "this_log_machine_group_topic" {
  description = "The topic of the log machine group"
  value       = concat(alicloud_log_machine_group.this.*.topic, [""])[0]
}

output "this_log_machine_group_identify_list" {
  description = "The identify list of the log machine group"
  value       = concat(alicloud_log_machine_group.this.*.identify_list, [[]])[0]
}

output "this_logtail_config_name" {
  description = "The name of the logtail config"
  value       = concat(alicloud_logtail_config.this.*.name, [""])[0]
}

output "this_logtail_config_input_type" {
  description = "The input type of the logtail config"
  value       = concat(alicloud_logtail_config.this.*.input_type, [""])[0]
}

output "this_logtail_config_log_sample" {
  description = "The log sample of the logtail config"
  value       = concat(alicloud_logtail_config.this.*.log_sample, [""])[0]
}

output "this_logtail_config_input_detail" {
  description = "The input detail of the logtail config"
  value       = concat(alicloud_logtail_config.this.*.input_detail, [""])[0]
}

output "this_instance_id" {
  description = "The Id of instances created by this module"
  value       = module.instances.this_instance_id
}

output "this_instance_name" {
  description =  "The name of instances created by this module"
  value       = module.instances.this_instance_name
}
