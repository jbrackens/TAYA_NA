/*  SSH key-pair  */

module "ansible-key-pair" {
  source  = "./modules/ssh-key-pair"
  region  = var.region
  profile = var.profile

  #key pair
  key_name   = "waysun-stag-ansible-ssh"
  public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEny4Pt4OYR9g31H65Nsoc8BSCuQD6MLDfay7BbVL2z1 support@flipsports.com"

  #pair_attachment
  attach = false

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

/*  ECS  */

// ansible
module "ansible" {
  source  = "./modules/instance"
  profile = var.profile
  region  = var.region

  number_of_instances  = 1
  name                 = "${var.project_name}-${var.environment}-ansible-srv01"
  deletion_protection  = false
  use_num_suffix       = true
  image_id             = var.ansible_srv01_image_id //data.alicloud_images.ubuntu.ids.0
  instance_type        = var.ansible_srv01_instance_type
  vswitch_id           = module.vpc.this_public_vswitch_ids[0]
  private_ip           = var.ansible_srv01_private_ip
  key_name             = module.ansible-key-pair.this_key_name
  user_data            = local.ansible_user_data
  system_disk_category = var.ansible_srv01_system_disk_category
  system_disk_size     = var.ansible_srv01_system_disk_size
  instance_charge_type = "PrePaid"

  subscription = {
    period             = 3
    period_unit        = "Week"
    renewal_status     = "AutoRenewal"
    auto_renew_period  = 1
    include_data_disks = true
  }

  security_group_ids = [
    module.ansible-security-group.this_security_group_id
  ]

  tags = {
    Created     = "Terraform"
    Environment = var.environment
  }
}

// ansible security group 
module "ansible-security-group" {
  source  = "./modules/security-group/modules/ssh"
  profile = var.profile
  region  = var.region

  name        = "ansible-${var.environment}-sg"
  description = "s:bastion:22"
  vpc_id      = module.vpc.this_vpc_id
  ingress_with_source_security_group_id = [
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = alicloud_security_group.openvpn-sg.id
    }
  ]
}

/*  Disk  */

resource "alicloud_disk" "ansible-srv01-data-disk" {
  encrypted            = false
  availability_zone    = "eu-central-1a" // must be static or disk will be recreated each time VM goes down
  size                 = 30
  delete_with_instance = false

  tags = {
    Name        = "${var.project_name}-${var.environment}-ansible-srv01-data-disk"
    Created     = "Terraform"
    Environment = var.environment
  }
}

resource "alicloud_disk_attachment" "ansible-srv01-data-disk-attachment" {
  disk_id     = alicloud_disk.ansible-srv01-data-disk.id
  instance_id = concat(module.ansible.this_instance_id, [""])[0]
  depends_on  = [module.ansible]
}
