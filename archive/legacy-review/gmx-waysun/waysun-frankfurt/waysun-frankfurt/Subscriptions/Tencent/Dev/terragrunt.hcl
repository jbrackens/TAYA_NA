locals {
  tencent_region = "eu-frankfurt"
  tencent_account = ""
  tencent_project = "waysun"
  environment     = "dev"
  prefix          = "terraform/state"
  tencentcloud_secret_id = "IKIDRikX5ORFn6AzZuzpDMGvKUP5VgbHhtpW"
  tencentcloud_secret_key = "ThgPt76pIZbNuCE0Xoqc9QSEl24sRkoc"

}

remote_state {

  backend  = "cos"
  config   = {
    encrypt= true
    # key    = "${local.tencent_project}-${local.environment}-1-1307473405/terraform.tfstate"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "${local.tencent_region}"
    bucket = "${local.tencent_project}-${local.environment}-1307473405"
    prefix = "${local.prefix}"
  }
   generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

terraform {
  # required_version = ">= 0.14.06"
  extra_arguments "bucket" {
    commands = "${get_terraform_commands_that_need_vars()}"
  }
}