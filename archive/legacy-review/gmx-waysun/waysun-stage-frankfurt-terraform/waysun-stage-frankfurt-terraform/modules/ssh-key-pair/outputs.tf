output "this_key_name" {
  description = "The name of the key pair."
  value       = concat(alicloud_key_pair.key_pair.*.key_name, [""])[0]
}

output "this_key_pair_fingerprint" {
  description = "The finger print of the key pair."
  value       = concat(alicloud_key_pair.key_pair.*.finger_print, [""])[0]
}

output "this_ecs_instance_ids" {
  description = "The list of ECS instance's ids."
  value       = alicloud_key_pair_attachment.key_pair.*.instance_ids
}