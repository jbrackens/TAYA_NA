variable "profile" {
  default = "default"
}
variable "region" {
  default = "cn-hangzhou"
}


provider "alicloud" {
  region  = var.region
  profile = var.profile
}

module "key_pair" {
  source  = "../.."
  profile = var.profile
  region  = var.region

  #key pair
  key_name = "my_public_key"
  tags = {
    Created     = "Terraform"
    Environment = "dev"
  }

  #pair_attachment
  instance_ids = ["i-bp17i59h2ixwxxxxxxx"]

}

