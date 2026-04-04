/*  SSH key-pair  */

module "openvpn-key-pair" {
  source  = "./modules/ssh-key-pair"
  region  = var.region
  profile = var.profile

  #key pair
  key_name   = "waysun-stag-openvpn-ssh"
  public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHMJ3K4puaT/vs/J7yqxcyPQblZ61neqGDSS6oizUuuH support@flipsports.com"

  #pair_attachment
  attach = false

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

/*  ECS  */

// openvpn
module "openvpn" {
  source  = "./modules/instance"
  profile = var.profile
  region  = var.region

  number_of_instances  = 1
  name                 = "${var.project_name}-${var.environment}-openvpn-srv"
  deletion_protection  = false
  use_num_suffix       = true
  image_id             = var.openvpn_image_id
  instance_type        = var.openvpn_instance_type
  vswitch_id           = module.vpc.this_public_vswitch_ids[1]
  private_ip           = var.openvpn_private_ip
  key_name             = module.openvpn-key-pair.this_key_name
  user_data            = local.bastion_user_data
  system_disk_category = var.openvpn_system_disk_category
  system_disk_size     = var.openvpn_system_disk_size
  instance_charge_type = "PrePaid"

  subscription = {
    period             = 3
    period_unit        = "Week"
    renewal_status     = "AutoRenewal"
    auto_renew_period  = 1
    include_data_disks = true
  }

  security_group_ids = [
    alicloud_security_group.openvpn-sg.id
  ]

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

// security group 
resource "alicloud_security_group" "openvpn-sg" {
  name        = "openvpn-${var.environment}-sg"
  description = "s:fw02-lon,mekong,ansible:22;s:INET:1194"
  vpc_id      = module.vpc.this_vpc_id
}

module "openvpn-ssh-security-group" {
  source  = "./modules/security-group/modules/ssh"
  profile = var.profile
  region  = var.region

  name              = "openvpn-${var.environment}-SSH-sg"
  description       = "s:fw02-lon,mekong:22"
  vpc_id            = module.vpc.this_vpc_id
  existing_group_id = alicloud_security_group.openvpn-sg.id

  ingress_cidr_blocks = var.allowed_external_ip
}

module "openvpn-internal-access-security-group" {
  source            = "./modules/security-group/modules/ssh"
  profile           = var.profile
  region            = var.region
  name              = "openvpn-${var.environment}-internal-access-sg"
  description       = "s:ansible:22"
  vpc_id            = module.vpc.this_vpc_id
  existing_group_id = alicloud_security_group.openvpn-sg.id

  ingress_with_source_security_group_id = [
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.ansible-security-group.this_security_group_id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = module.ansible-security-group.this_security_group_id
    },
  ]
}

module "openvpn-openvpn-security-group" {
  source  = "./modules/security-group/modules/openvpn"
  profile = var.profile
  region  = var.region

  name               = "openvpn-${var.environment}-openvpn-sg"
  description        = "s:INET:udp,1194"
  vpc_id             = module.vpc.this_vpc_id
  auto_ingress_rules = ["openvpn-udp"]
  existing_group_id  = alicloud_security_group.openvpn-sg.id

  ingress_cidr_blocks = ["0.0.0.0/0"]
}

// openvpn EIP
module "associate-with-openvpn" {
  source  = "./modules/eip"
  region  = var.region
  profile = var.profile

  create               = true
  name                 = "eip-openvpn-${var.environment}"
  bandwidth            = var.eip_bandwidth
  internet_charge_type = "PayByTraffic"
  instance_charge_type = "PostPaid"
  period               = 1

  instances = [
    {
      instance_ids  = module.openvpn.this_instance_id
      instance_type = "EcsInstance"
      private_ips   = []
    }
  ]
}
