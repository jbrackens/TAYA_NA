output "this_key_name" {
  description = "The name of the key pair."
  value       = module.key_pair.this_key_name
}

output "this_key_pair_fingerprint" {
  description = "The finger print of the key pair."
  value       = module.key_pair.this_key_pair_fingerprint
}

output "this_ecs_instance_ids" {
  description = "The list of ECS instance's ids."
  value       = module.key_pair.this_ecs_instance_ids
}