/*  ECS  */

// nifi-registry
module "nifi-registry" {
  source  = "./modules/instance"
  profile = var.profile
  region  = var.region

  number_of_instances  = 1
  name                 = "${var.project_name}-${var.environment}-nifi-registry"
  deletion_protection  = false
  use_num_suffix       = true
  image_id             = var.nifi_registry_image_id
  instance_type        = var.nifi_registry_instance_type
  vswitch_id           = module.vpc.this_public_vswitch_ids[0]
  private_ip           = var.nifi_registry_private_ip
  key_name             = module.nifi-key-pair.this_key_name
  user_data            = local.nifi_user_data
  system_disk_category = var.nifi_registry_system_disk_category
  system_disk_size     = var.nifi_registry_system_disk_size
  instance_charge_type = "PrePaid"

  subscription = {
    period             = 3
    period_unit        = "Week"
    renewal_status     = "AutoRenewal"
    auto_renew_period  = 1
    include_data_disks = true
  }

  security_group_ids = [
    module.nifi-registry-security-group.this_security_group_id,
  ]

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

// nifi-registry security group
module "nifi-registry-security-group" {
  source      = "./modules/security-group/modules/ssh"
  profile     = var.profile
  region      = var.region
  name        = "nifi-registry-${var.environment}"
  description = "s:bastion,ansible:22;s:bastion:ICMP;s:nifi:ALL"
  vpc_id      = module.vpc.this_vpc_id

  ingress_with_source_security_group_id = [
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.ansible-security-group.this_security_group_id
    },
    {
      rule                     = "http-8080-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "all-all"
      source_security_group_id = module.nifi-security-group.this_security_group_id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
  ]
}

/*  Disk  */

resource "alicloud_disk" "nifi-registry-data-disk" {
  encrypted            = false
  availability_zone    = "eu-central-1a" // must be static or disk will be recreated each time VM goes down
  size                 = 40
  delete_with_instance = false

  tags = {
    Name        = "${var.project_name}-${var.environment}-nifi-registry-data-disk"
    Created     = "Terraform"
    Environment = var.environment
  }
}

resource "alicloud_disk_attachment" "nifi-registry-data-disk-attachment" {
  disk_id     = alicloud_disk.nifi-registry-data-disk.id
  instance_id = concat(module.nifi-registry.this_instance_id, [""])[0]
  depends_on  = [module.nifi-registry]
}

/*  DNS Private Records  */

resource "alicloud_pvtz_zone_record" "private_domain_record_nifi_registry" {

  zone_id  = alicloud_pvtz_zone.waysun-priavte-zone.id
  rr       = "nifi-registry"
  type     = "A"
  value    = concat(module.nifi-registry.this_private_ip, [""])[0]
  priority = 1
}
