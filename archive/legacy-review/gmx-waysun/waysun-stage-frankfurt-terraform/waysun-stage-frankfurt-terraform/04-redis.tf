/*  Redis  */

// https://www.alibabacloud.com/help/doc-detail/144988.htm?spm=a2c63.p38356.879954.6.541316252oiFeG#concept-2348204
module "staging-redis" {
  source       = "./modules/redis"
  region       = var.region
  profile      = var.profile
  project_name = "${var.project_name}-${var.environment}"

  // Redis Instance
  engine_version    = var.redis_engine_version
  instance_name     = "${var.project_name}-${var.environment}"
  instance_class    = var.redis_instance_class
  vswitch_id        = module.vpc.this_public_vswitch_ids[0]
  availability_zone = "eu-central-1a"

  // Redis subscription
  instance_charge_type = "PrePaid"
  period               = 3
  auto_renew           = true
  auto_renew_period    = 1

  // Redis backup_policy
  backup_policy_backup_time   = var.redis_backup_time
  backup_policy_backup_period = var.redis_backup_period
  enable_alarm_rule           = false // Comment: PK20200825 cms_alarm - doesn't work - further investigatin required

  // Redis security
  security_ips      = ["10.2.0.0/23"] // Comment: PK20210304. Mandatory - set it to 127.0.0.1 to deny access from all addresses. The security_group_id doesnt work so no communication with Redis. Ticket with Alicloud - no resolution.
  security_group_id = module.bastion-security-group.this_security_group_id

  tags = {
    Env     = var.environment
    Project = var.project_name
  }
}

