// k8s EIP  (used by Ingress)
module "k8s-eip01" {
  source  = "./modules/eip"
  region  = var.region
  profile = var.profile

  create               = true
  name                 = "k8s-eip01-${var.environment}"
  bandwidth            = var.eip_bandwidth
  internet_charge_type = "PayByTraffic"
  instance_charge_type = "PostPaid"
  period               = 1
}

/* NFS */

resource "alicloud_nas_file_system" "k8s-flink-nfs" {
  protocol_type = "NFS"
  storage_type  = "Performance"
  description   = "flink-cluster-stage"
}

resource "alicloud_nas_access_group" "k8s-flink-nfs-access-group" {
  access_group_name = "k8s-flink-${var.environment}-nfs"
  access_group_type = "Classic"
  description       = "k8s-flink-${var.environment}-nfs"
}

resource "alicloud_nas_access_rule" "k8s-flink-nfs-access" {
  access_group_name = alicloud_nas_access_group.k8s-flink-nfs-access-group.access_group_name
  source_cidr_ip    = "10.2.0.0/23"
  rw_access_type    = "RDWR"
  user_access_type  = "no_squash"
  priority          = 2
}

resource "alicloud_nas_mount_target" "k8s-flink-nfs-mount-target" {
  file_system_id    = alicloud_nas_file_system.k8s-flink-nfs.id
  access_group_name = alicloud_nas_access_group.k8s-flink-nfs-access-group.access_group_name
  vswitch_id        = module.vpc.this_public_vswitch_ids[0]
}

/* SLB for k8s */

module "k8s-ingress-slb01" {
  source  = "./modules/slb"
  region  = var.region
  profile = var.profile

  name           = "${var.project_name}-${var.environment}-k8s-slb01"
  bandwidth      = 100
  vswitch_id     = module.vpc.this_public_vswitch_ids[0]
  address_type   = "intranet" // Comment: PK20201015 To allocate EIP SLB must be assigned to VPC (address_type=intranet)
  spec           = "slb.s1.small"
  master_zone_id = var.availability_zones[0]

  tags = {
    Name                        = "${var.project_name}-${var.environment}-k8s-slb01"
    Description                 = "SLB for ingress k8s ns ${var.environment}"
    Created                     = "Terraform"
    Environment                 = var.environment
    Project                     = "waysun"
    "kubernetes.reused.by.user" = "true"
  }
}

resource "alicloud_eip_association" "eip-k8s-ingress-slb01-attachment" {
  allocation_id = module.k8s-eip01.this_eip_id[0]
  instance_id   = module.k8s-ingress-slb01.this_slb_id
}

/*  K8s Managed */

module "waysun-prod-managed-k8s" {
  source = "./modules/k8s/k8s-managed"

  region               = var.region
  profile              = var.profile
  k8s_name_prefix      = "${var.project_name}-${var.environment}-k8s-cluster"
  new_vpc              = false
  new_nat_gateway      = false
  ecs_password         = var.k8s_workers_ecs_password
  vswitch_ids          = [module.vpc.this_public_vswitch_ids[0]]
  slb_internet_enabled = false
  security_group_id    = alicloud_security_group.k8s-acs-sg.id
  kubernetes_version   = "1.18.8-aliyun.1"

  worker_instance_types = ["ecs.t6-c1m2.large"]
  worker_number         = 4

  //subcription
  worker_payment_type = {
    worker_instance_charge_type = "PrePaid"
    worker_period               = 1
    worker_auto_renew           = true
    worker_auto_renew_period    = 3
  }

  kube_config_path     = "~/.kube/waysun-${var.environment}-frankfurt/config"
  client_cert_path     = "~/.kube/waysun-${var.environment}-frankfurt/client-cert.pem"
  client_key_path      = "~/.kube/waysun-${var.environment}-frankfurt/client-key.pem"
  cluster_ca_cert_path = "~/.kube/waysun-${var.environment}-frankfurt/cluster-ca-cert.pem"

  cluster_addons = [
    {
      name   = "flannel",
      config = "",
    },
    {
      name   = "flexvolume",
      config = "",
    },
    {
      name   = "alicloud-disk-controller",
      config = "",
    },
    {
      name   = "logtail-ds",
      config = "{\"IngressDashboardEnabled\":\"true\"}",
    }
    # Comment: PK20201015 Error: InvalidPodCidr Message: PodCidr conflict with PodVswitch
    # {
    #   name   = "terway-eniip",
    #   config = "",
    # }      
  ]
}

// k8s security group
resource "alicloud_security_group" "k8s-acs-sg" {
  name        = "k8s-acs-${var.environment}-sg"
  description = "s:ALL:ICMP;s:vpc:ALL"
  vpc_id      = module.vpc.this_vpc_id
}

module "k8s-allow-ICMP-sg" {
  source              = "./modules/security-group/modules/icmp"
  profile             = var.profile
  region              = var.region
  name                = "k8s-acs-${var.environment}-icmp"
  description         = "s:ALL:ICMP"
  vpc_id              = module.vpc.this_vpc_id
  existing_group_id   = alicloud_security_group.k8s-acs-sg.id
  ingress_cidr_blocks = ["0.0.0.0/0"]
}

module "k8s-allow-ALL-sg" {
  source            = "./modules/security-group/modules/all"
  profile           = var.profile
  region            = var.region
  name              = "k8s-acs-${var.environment}-all"
  description       = "s:vpc:ALL"
  vpc_id            = module.vpc.this_vpc_id
  existing_group_id = alicloud_security_group.k8s-acs-sg.id
  ingress_cidr_blocks = [
    "172.20.0.0/16"
  ]
}

/* DNS */

module "add-zolbass-dns-records" {
  source               = "./modules/dns/public-zone"
  region               = var.region
  profile              = var.profile
  existing_domain_name = module.waysun-public-zone.this_domain_name
  records = [
    {
      rr       = "@"
      type     = "A"
      ttl      = 600
      value    = concat(module.k8s-eip01.this_eip_address, [""])[0]
      priority = 1
    }
  ]
}

/*  DNS Private Records  */

module "private_domain_record_k8s" {
  region  = var.region
  profile = var.profile
  source  = "./modules/dns/private-zone"
  zone_id = alicloud_pvtz_zone.waysun-priavte-zone.id

  dns_records = [
    {
      rr       = "api-gateway"
      type     = "A"
      value    = module.k8s-ingress-slb01.this_slb_address
      ttl      = 600
      priority = 1
    },
  ]
}

