#output "vpc_id" {
#  description = "The id of redis."
#  value       = length(var.vpc_id) == 0 ? tencentcloud_vpc.example.*.id : var.vpc_id
#}
#
#output "subnet_ids" {
#  description = "The id of subnets."
#  # value       = tencentcloud_subnet.example.*.id
#  value       = length(var.subnet_id) == 0 ? tencentcloud_subnet.example.*.id : var.subnet_id
#}

 output "repository_id" {
   description = "The id of repositories."
   value       = tencentcloud_tcr_repository.example.*.id
 }

output "token" {
  value = tencentcloud_tcr_token.example.token
}
output "user_name" {
  description = "The TCR instance user name."
  value       = tencentcloud_tcr_token.example.user_name
}