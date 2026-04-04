/*  RDS  */

// Comment: PK20200825 DB user account owner must be configured from AliCloud console at this stage
module "staging-rds" {
  source            = "./modules/rds"
  connection_prefix = "${var.project_name}-${var.environment}-rds"
  region            = var.region
  profile           = var.profile

  # Rds Instance
  instance_name              = "${var.project_name}-${var.environment}-rds"
  vswitch_id                 = module.vpc.this_public_vswitch_ids[0]
  instance_type              = var.rds_instance_type
  instance_storage           = var.rds_instance_storage
  allocate_public_connection = var.rds_public
  engine                     = var.rds_engine
  engine_version             = var.rds_engine_version
  port                       = var.rds_port

  # Rds charge type
  instance_charge_type = "Prepaid"
  subscription = {
    period            = 3
    auto_renew        = true
    auto_renew_period = 1
  }

  # Rds Backup policy
  preferred_backup_period     = var.rds_backup_period
  preferred_backup_time       = var.rds_backup_time
  backup_retention_period     = var.rds_backup_retention
  log_backup_retention_period = var.rds_log_backup_retention

  # Rds creds
  create_account  = var.rds_create_account
  privilege       = var.rds_privilege
  create_database = var.rds_create_database
  account_name    = var.rds_account_name // 1pass
  password        = var.rds_password     // 1pass
  databases       = var.rds_databases    // 1pass 

  # Rds security
  security_ips = ["127.0.0.1"]
  security_group_ids = [
    module.bastion-security-group.this_security_group_id,
    alicloud_security_group.k8s-acs-sg.id
  ] // Comment: ping works from any source but connection can be established only from whitelisted in security_group_ids

  tags = {
    Env     = var.environment
    Project = var.project_name
  }
}

