output "redis_id" {
  description = "The id of redis."
  value       = tencentcloud_redis_instance.redis_instance.*.id
}