#********************************
#  General - do not change  # 
#********************************

/*  VPC  */

module "vpc" {
  source = "./modules/vpc"

  region                = var.region
  environment           = var.environment
  project_name          = var.project_name
  profile               = var.profile
  vpc_name              = "${var.project_name}-${var.environment}-vpc"
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  vswitch_public_cidrs  = var.public_subnet_cidrs
  vswitch_private_cidrs = var.private_subnet_cidrs

  vpc_tags = {
    Owner       = var.project_name
    Environment = var.environment
    Name        = "vpc"
  }

  vswitch_tags = {
    Project  = var.project_name
    Endpoint = "true"
  }
}

// VPC security group DEFAULT
module "vpc-security-group" {
  source  = "./modules/security-group"
  profile = var.profile
  region  = var.region

  name        = "vpc-${var.environment}-sg"
  description = "Default VPC ${var.environment} security-group"
  vpc_id      = module.vpc.this_vpc_id

}

/*  NAT  */

module "nat-gateway" {
  source = "./modules/nat"
  region = var.region

  create     = true
  vpc_id     = module.vpc.this_vpc_id
  name       = "${var.project_name}-${var.environment}-nat"
  nat_type   = "Enhanced"
  vswitch_id = module.vpc.this_public_vswitch_ids[0]

  // subscription
  instance_charge_type = "PrePaid" // Comment: PK20210319 - changing the charge type will ForceNew. Cannot be terminated before the prepaid period expire
  period               = 1         // Comment: At present, the provider does not support modify "period" but you can do that via web console.
}

/*  NAT EIP  */

module "associate-with-nat" {
  source  = "./modules/eip"
  region  = var.region
  profile = var.profile

  number_of_eips       = 0 // Comment: should be ignored but its not - so define here 
  create               = true
  name                 = "eip-nat-${var.environment}"
  bandwidth            = var.eip_bandwidth
  internet_charge_type = "PayByTraffic"
  instance_charge_type = "PostPaid" // Comment: PK20210319 - changing the charge type will ForceNew
  period               = 1

  instances = [
    {
      instance_ids  = [module.nat-gateway.this_nat_gateway_id[0]]
      instance_type = "Nat"
      private_ips   = []
    }
  ]
}

module "snat_entry" {
  source = "./modules/snat_entry"

  snat_count         = 1
  snat_table_id      = module.nat-gateway.this_nat_gateway_snat_table_ids_str
  source_vswitch_ids = [module.vpc.this_public_vswitch_ids[0]]
  snat_ips           = module.associate-with-nat.this_eip_address
}

/*  SSH key-pair  */

module "waysun-ssh-key-pair" {
  source  = "./modules/ssh-key-pair"
  region  = var.region
  profile = var.profile

  #key pair
  key_name   = "waysun-${var.environment}-ssh"
  public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIE4Sgudv5hJikY4uoCSGqtGxl7J3EvgC1eeKtcZnqIc support@flipsports.net"

  #pair_attachment
  attach = false

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

/*  ECS  */

// bastion
module "bastion" {
  source  = "./modules/instance"
  profile = var.profile
  region  = var.region

  number_of_instances  = 1
  name                 = "${var.project_name}-${var.environment}-bastion"
  deletion_protection  = false
  use_num_suffix       = true
  image_id             = var.bastion_image_id
  instance_type        = var.bastion_instance_type
  vswitch_id           = module.vpc.this_public_vswitch_ids[0]
  private_ip           = var.bastion_private_ip
  key_name             = module.waysun-ssh-key-pair.this_key_name
  user_data            = local.bastion_user_data
  system_disk_category = var.bastion_system_disk_category
  system_disk_size     = var.bastion_system_disk_size
  instance_charge_type = "PrePaid"

  subscription = {
    period             = 3
    period_unit        = "Week"
    renewal_status     = "AutoRenewal"
    auto_renew_period  = 1
    include_data_disks = true
  }

  security_group_ids = [
    module.bastion-security-group.this_security_group_id
  ]

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

// bastion security group 
module "bastion-security-group" {
  source  = "./modules/security-group/modules/ssh"
  profile = var.profile
  region  = var.region

  name                = "bastion-${var.environment}-sg"
  description         = "s:fw02-lon,mekong:22"
  vpc_id              = module.vpc.this_vpc_id
  ingress_cidr_blocks = var.allowed_external_ip
}

// bastion EIP
module "associate-with-bastion" {
  source  = "./modules/eip"
  region  = var.region
  profile = var.profile

  create               = true
  name                 = "eip-bastion-${var.environment}"
  bandwidth            = var.eip_bandwidth
  internet_charge_type = "PayByTraffic"
  instance_charge_type = "PostPaid"
  period               = 1

  instances = [
    {
      instance_ids  = module.bastion.this_instance_id
      instance_type = "EcsInstance"
      private_ips   = []
    }
  ]
}

/* Container registry */

resource "alicloud_cr_namespace" "waysun-namespace" {
  name               = "${var.project_name}-${var.environment}-namespace"
  auto_create        = true
  default_visibility = "PRIVATE"
}

/*  OSS Logs  */

module "oss-logs" {
  source      = "./modules/oss"
  profile     = var.profile
  region      = var.region
  bucket_name = var.logs_bucket_name
  acl         = var.logs_bucket_policy

  lifecycle_rule = [
    {
      id      = "rule-1year"
      prefix  = "logs*/"
      enabled = true
      expiration = [
        {
          days = 365
        },
      ]
    }
  ]
}

/*  DNS */

// Issue #2761 https://github.com/aliyun/terraform-provider-alicloud/issues/2761 PK20200825
// New subdomain has to verified from Aliyun Console (got to console and add manually till you get the verification code - do not deploy from consol) before triggering 'terraform apply'
module "waysun-public-zone" {
  source      = "./modules/dns/public-zone"
  region      = var.region
  profile     = var.profile
  domain_name = "stag.${var.domain_name}"
}

// Private Zone
resource "alicloud_pvtz_zone" "waysun-priavte-zone" {
  zone_name = "${var.domain_name}.${var.environment}.internal"
}

resource "alicloud_pvtz_zone_attachment" "waysun-priavte-zone-attachment" {
  zone_id = alicloud_pvtz_zone.waysun-priavte-zone.id
  vpc_ids = [module.vpc.this_vpc_id]
}
