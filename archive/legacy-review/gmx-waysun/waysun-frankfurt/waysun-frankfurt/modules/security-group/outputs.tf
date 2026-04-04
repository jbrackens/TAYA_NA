output "security_group_id" {
  description = "The id of security group."
  value       = var.security_group_id != "" ? var.security_group_id : concat(tencentcloud_security_group.sg.*.id, [""])[0]
}

output "security_group_name" {
  description = "The name of security group."
  value       = concat(tencentcloud_security_group.sg.*.name, [""])[0]
}

output "security_group_description" {
  description = "The description of security group."
  value       = concat(tencentcloud_security_group.sg.*.description, [""])[0]
}
