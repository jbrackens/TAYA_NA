provider "alicloud" {
  profile                 = var.profile != "" ? var.profile : null
  region                  = var.region != "" ? var.region : null
}

// ECS Instance Resource for Module
resource "alicloud_alikafka_instance" "this" {
  name                                = var.host_name
  topic_quota                         = var.topic_quota
  deploy_type                         = var.deploy_type
  io_max                              = var.io_max 
  eip_max                             = var.eip_max != "" ? var.eip_max : null
  paid_type                           = var.paid_type != "" ? var.paid_type : null
  spec_type                           = var.spec_type
  vswitch_id                          = var.vswitch_id
  service_version                     = var.service_version
  disk_type  = var.disk_type
  disk_size  = var.disk_size 
}
