resource "tencentcloud_redis_backup_config" "redis_backup_config" {
  count = length(var.redis_names) > 0 ? length(var.redis_names) : 0

  redis_id      = tencentcloud_redis_instance.redis_instance[count.index].id
  backup_time   = "${var.redis_backup_time}"
  backup_period = "${var.redis_backup_period}"
}

resource "tencentcloud_redis_instance" "redis_instance" {
  count = length(var.redis_names) > 0 ? length(var.redis_names) : 0
  
  availability_zone                   = var.availability_zone
  type_id                             = var.redis_type_id
  password                            = "{$var.redis_password}"
  mem_size                            = var.redis_mem_size
  name                                = element(var.redis_names, count.index)
  port                                = var.redis_port
  charge_type                         = element(var.redis_charge_type, count.index)
  prepaid_period                      = var.redis_charge_type == "PREPAID" ? var.redis_prepaid_period : null
  force_delete                        = var.redis_charge_type == "PREPAID" ? var.redis_force_delete : null
  redis_shard_num                     = var.redis_shard_num
  project_id                          = var.project_id
  vpc_id                              = var.vpc_id
  subnet_id = var.subnet_id

  tags = merge(
    {
      "Name": element(var.redis_names, count.index)
    },
    var.redis_tags[count.index]
  )
}
