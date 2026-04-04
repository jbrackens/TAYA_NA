locals {
  project_name                    = "waysun"
  project_id                      = "1000000665"
  environment                     = "dev"
  region_id                       = "eu-frankfurt"
  tencent_region                  = "eu-frankfurt-2"
  vpc_id                          = "vpc-4lpl6nut"
  cidr_block                      = "10.16.0.0/16"
  microservice_with_internet_cidr = "10.16.103.0/24"
  tools_cidr                      = "10.16.105.0/24"
  databases_cidr                  = "10.16.106.0/24"
  microservice_cidr               = "10.16.107.0/24"
  availability_zone               = "eu-frankfurt-2"
  streaming_subnet_cidr           = "10.16.101.0/24"
  load_balancer_subnet_cidr       = "10.16.108.0/24"
  public_subnets_cidr             = ""
  private_subnets_cidr            = ""
  database_subnets_cidr           = ""
  private_route_id                = "rtb-0gl0ubsc"
  public_route_id                 = "rtb-6mb4j3mo"

  postgres = {
    postgresql_engine_version   = "12.4"
    postgresql_charset          = "UTF8"
    postgresql_memory           = 2
    postgresql_storage          = 100
    postgresql_charge_type      = "POSTPAID_BY_HOUR"
    postgresql_root_user        = "waysun_root"
    postgresql_root_password    = "Postgres@1x4tYusl90pREws"
    security_groups  = "sg-36u1c486"
  }

  bastion = {

  }
}