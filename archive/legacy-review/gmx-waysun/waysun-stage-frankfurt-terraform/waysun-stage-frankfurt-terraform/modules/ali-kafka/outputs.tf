output "id" {
  description = "ID of the kafka instance"
  value       = concat(alicloud_alikafka_instance.this.*.id, [""])[0]
}