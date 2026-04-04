// Comment: PK20210322 - Auto-renew on PrePaid doesnt work. Check deposit_type as default HALF_MANAGED
// Once you trigger terraform apply - go to AliCloud console and purchase EMR manualy - otherwise terraform will crash 
module "emr-kafka" {
  source  = "./modules/emr/kafka"
  region  = var.region
  profile = var.profile

  create        = true
  emr_version   = "EMR-4.6.0"
  instance_type = "ecs.n4.xlarge"

  emr_cluster_name  = "${var.project_name}-${var.environment}-emr-kafka"
  vswitch_id        = module.vpc.this_public_vswitch_ids[0]
  security_group_id = alicloud_security_group.emr-kafka-sg.id

  high_availability_enable = false
  is_open_public_ip        = false
  ssh_enable               = false
  master_pwd               = var.emr_kafka_password

  host_groups = [
    {
      host_group_name   = "kafka_master_group"
      host_group_type   = "MASTER"
      node_count        = 1
      disk_count        = 4
      disk_capacity     = "50"
      disk_type         = "cloud_efficiency" //ultra cloud disk
      sys_disk_type     = "cloud_efficiency"
      sys_disk_capacity = "100"
      charge_type       = "PrePaid"
      period            = 3
      auto_renew        = true
    },
    {
      host_group_name   = "kafka_core_group"
      host_group_type   = "CORE"
      node_count        = 2
      disk_count        = 4
      disk_capacity     = "50"
      disk_type         = "cloud_efficiency"
      sys_disk_type     = "cloud_efficiency"
      sys_disk_capacity = "100"
      charge_type       = "PrePaid"
      period            = 3
      auto_renew        = true
    }
  ]

  // emr-subscription
  charge_type = "PrePaid"
  period      = 3
}

resource "alicloud_security_group" "emr-kafka-sg" {
  name        = "emr-kafka-${var.environment}-sg"
  description = "s:bastion:22,2181,9092,ICMP,8081-8085;s:nifi,k8s:2181,8081,9092"
  vpc_id      = module.vpc.this_vpc_id
}

// emr-kafka security group
module "emr-kafka-registry-security-group" {
  source            = "./modules/security-group/modules/ssh"
  profile           = var.profile
  region            = var.region
  name              = "emr-kafka-${var.environment}"
  description       = "s:bastion:22,2181,9092,ICMP,8081-8085;s:nifi,k8s,openvpn:2181,8081,9092"
  vpc_id            = module.vpc.this_vpc_id
  existing_group_id = alicloud_security_group.emr-kafka-sg.id

  ingress_with_source_security_group_id = [
    {
      rule                     = "ssh-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "zookeeper-2181-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "kafka-broker-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "emr-kafka-schema-registry-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "emr-kafka-rest-proxy-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "emr-kafka-connect-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "emr-kafka-metadata-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "emr-kafka-manager-tcp"
      source_security_group_id = module.bastion-security-group.this_security_group_id
    },
    {
      rule                     = "zookeeper-2181-tcp"
      source_security_group_id = alicloud_security_group.k8s-acs-sg.id
    },
    {
      rule                     = "kafka-broker-tcp"
      source_security_group_id = alicloud_security_group.k8s-acs-sg.id
    },
    {
      rule                     = "emr-kafka-schema-registry-tcp"
      source_security_group_id = alicloud_security_group.k8s-acs-sg.id
    },
    {
      rule                     = "zookeeper-2181-tcp"
      source_security_group_id = module.nifi-security-group.this_security_group_id
    },
    {
      rule                     = "kafka-broker-tcp"
      source_security_group_id = module.nifi-security-group.this_security_group_id
    },
    {
      rule                     = "emr-kafka-schema-registry-tcp"
      source_security_group_id = module.nifi-security-group.this_security_group_id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = alicloud_security_group.k8s-acs-sg.id
    },
    {
      rule                     = "zookeeper-2181-tcp"
      source_security_group_id = alicloud_security_group.openvpn-sg.id
    },
    {
      rule                     = "kafka-broker-tcp"
      source_security_group_id = alicloud_security_group.openvpn-sg.id
    },
    {
      rule                     = "emr-kafka-schema-registry-tcp"
      source_security_group_id = alicloud_security_group.openvpn-sg.id
    },
    {
      rule                     = "all-icmp"
      source_security_group_id = alicloud_security_group.openvpn-sg.id
    },
  ]
}

/*  DNS Private Records  */

resource "alicloud_pvtz_zone_record" "private_domain_record_zoo_kafka_1" {

  zone_id  = alicloud_pvtz_zone.waysun-priavte-zone.id
  rr       = "zoo-kafka1"
  type     = "A"
  value    = "10.2.1.13"
  priority = 1
}

resource "alicloud_pvtz_zone_record" "private_domain_record_zoo_kafka_2" {

  zone_id  = alicloud_pvtz_zone.waysun-priavte-zone.id
  rr       = "zoo-kafka2"
  type     = "A"
  value    = "10.2.1.14"
  priority = 1
}

resource "alicloud_pvtz_zone_record" "private_domain_record_zoo_kafka_3" {

  zone_id  = alicloud_pvtz_zone.waysun-priavte-zone.id
  rr       = "zoo-kafka3"
  type     = "A"
  value    = "10.2.1.15"
  priority = 1
}
