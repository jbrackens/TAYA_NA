/*  VPC  */

provider "alicloud" {
  profile                 = var.profile != "" ? var.profile : null
  shared_credentials_file = var.shared_credentials_file != "" ? var.shared_credentials_file : null
  region                  = var.region != "" ? var.region : null
  skip_region_validation  = var.skip_region_validation
  configuration_source    = "terraform-alicloud-modules/vpc"
}

// If there is not specifying vpc_id, the module will launch a new vpc
resource "alicloud_vpc" "vpc" {
  count             = var.vpc_id != "" ? 0 : var.create ? 1 : 0
  name              = var.vpc_name
  cidr_block        = var.vpc_cidr
  resource_group_id = var.resource_group_id
  description       = var.description
  tags = merge(
    {
      "Name" = format("%s", var.vpc_name)
    },
    var.vpc_tags,
  )
}

// According to the vswitch cidr blocks to launch several public vswitches
resource "alicloud_vswitch" "public_vswitches" {
  count             = local.create_sub_resources ? length(var.vswitch_public_cidrs) : 0
  vpc_id            = var.vpc_id != "" ? var.vpc_id : concat(alicloud_vpc.vpc.*.id, [""])[0]
  cidr_block        = var.vswitch_public_cidrs[count.index]
  availability_zone = element(var.availability_zones, count.index)
  name              = length(var.vswitch_public_cidrs) > 1 || var.use_num_suffix ? format("%s-%s-%s-%03d", var.project_name, var.environment, element(var.availability_zones, count.index), count.index + 1) : var.vswitch_public_name
  description       = var.description
  tags = merge(
    {
      Name = format(
        "%s-%s-%s-%03d",
        var.project_name,
        var.environment ,
        element(var.availability_zones, count.index),      
        count.index + 1
      )
    },
    var.vswitch_tags,
  )
}

// According to the vswitch cidr blocks to launch several private vswitches
# resource "alicloud_vswitch" "private_vswitches" {
#   count             = local.create_sub_resources ? length(var.vswitch_private_cidrs) : 0
#   vpc_id            = var.vpc_id != "" ? var.vpc_id : concat(alicloud_vpc.vpc.*.id, [""])[0]
#   cidr_block        = var.vswitch_private_cidrs[count.index]
#   availability_zone = element(var.availability_zones, count.index)
#   name              = length(var.vswitch_private_cidrs) > 1 || var.use_num_suffix ? format("%s-%s-%03d", var.vswitch_private_name, element(var.availability_zones, count.index), count.index + 1) : var.vswitch_private_name
#   description       = var.vswitch_description
#   tags = merge(
#     {
#       Name = format(
#         "%s-%s-%03d",
#         var.vswitch_private_name,
#         element(var.availability_zones, count.index),
#         count.index + 1
#       )
#     },
#     var.vswitch_tags,
#   )
# }

// According to the destination cidr block to launch a new route entry
resource "alicloud_route_entry" "route_entry" {
  count                 = local.create_sub_resources ? length(var.destination_cidrs) : 0
  route_table_id        = local.route_table_id
  destination_cidrblock = var.destination_cidrs[count.index]
  nexthop_type          = "Instance"
  nexthop_id            = var.nexthop_ids[count.index]
}

