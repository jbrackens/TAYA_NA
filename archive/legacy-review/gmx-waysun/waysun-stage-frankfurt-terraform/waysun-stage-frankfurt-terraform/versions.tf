terraform {
  required_version = "= 0.14.06"
  required_providers {
    alicloud = {
      version = "= 1.115.1"
    }
  }
  backend "s3" {
    bucket = "ws-a-rem-bucket"
    key    = "waysun-stage-frankfurt-aliyun/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "alicloud" {
  region  = var.region
  profile = var.profile
}
