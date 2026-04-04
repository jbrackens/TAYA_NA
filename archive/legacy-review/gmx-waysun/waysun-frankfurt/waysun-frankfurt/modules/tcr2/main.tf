locals {
#  namespace_names = distinct(keys(var.namespace_repository_map))
#  repository_names = distinct(values(var.namespace_repository_map))
  namespace_names = distinct([for i in var.namespace_repository_map: i[0]])
  repository_names = distinct([for i in var.namespace_repository_map: i[1]])
}

resource "tencentcloud_tcr_instance" "example" {
  name        = "${var.instance_name}"
  instance_type = "${var.instance_type}"
  delete_bucket = true

  tags = merge(
    {
      "Name": "${var.instance_name}"
    },
    "${var.instance_tags}")
}

resource "tencentcloud_tcr_token" "example" {
  instance_id = tencentcloud_tcr_instance.example.id
  description       = "${var.token_description}"
  enable   = "${var.token_state}"
}

#multiple namespace attached to a single instance
resource "tencentcloud_tcr_namespace" "example" {
  count = length(local.namespace_names) > 0 ? length(local.namespace_names) : 0

  instance_id = tencentcloud_tcr_instance.example.id
  name        = local.namespace_names[count.index]
  is_public   = "${var.token_is_public}"
}

#multiple repositories attached to a single instance
#resource "tencentcloud_tcr_repository" "example" {
#  count = length(values(var.namespace_repository_map)) > 0 ? length(var.namespace_repository_map) : 0
##  count = length(values(var.namespace_repository_map)) > 0 ? length(var.namespace_repository_map) : 0
#
#  instance_id = tencentcloud_tcr_instance.example.id
#  namespace_name= keys(var.namespace_repository_map)[count.index]
#  name = var.namespace_repository_map[keys(var.namespace_repository_map)[count.index]]
#  brief_desc = "${var.repository_brief_description}"
#  description = "${var.repository_description}"
#}

resource "tencentcloud_tcr_repository" "example" {
  count = length(var.namespace_repository_map) > 0 ? length(var.namespace_repository_map) : 0

  instance_id = tencentcloud_tcr_instance.example.id
#  namespace_name= var.namespace_repository_map[count.index][0]
#  name = var.namespace_repository_map[count.index][1]
  namespace_name= element(var.namespace_repository_map[count.index], 0)
  name = element(var.namespace_repository_map[count.index], 1)
  depends_on = [
    tencentcloud_tcr_namespace.example,
  ]
  brief_desc = var.repository_brief_description
  description = var.repository_description
}

#resource "tencentcloud_tcr_repository" "example" {
#    instance_id = tencentcloud_tcr_instance.example.id
#    brief_desc     = "example"
#    description    = "long example"
#    name           = "stella5555"
#    namespace_name = "stella"
#}
#
## module.vpc.tencentcloud_tcr_repository.example[1] will be created
#resource "tencentcloud_tcr_repository" "example1" {
#    instance_id = tencentcloud_tcr_instance.example.id
#    brief_desc     = "example"
#    description    = "long example"
#    name           = "test2"
#    namespace_name = "default"
#}

# data "tencentcloud_tcr_instances" "example" {
#   name = tencentcloud_tcr_instance.example.name
# }

# data "tencentcloud_tcr_tokens" "example" {
#   instance_id = tencentcloud_tcr_token.example.instance_id
# }

# data "tencentcloud_tcr_namespaces" "example" {
#   count = length(var.namespace_names) > 0 ? length(var.namespace_names) : 0
#   instance_id = tencentcloud_tcr_namespace.example[count.index].instance_id
# }

# data "tencentcloud_tcr_repositories" "example" {
#   count = length(var.repository_names) > 0 ? length(var.repository_names) : 0

#   instance_id = tencentcloud_tcr_repository.example[count.index].instance_id
#   namespace_name = tencentcloud_tcr_namespace.example[count.index].name
# }

# get internal vpc access
resource "tencentcloud_vpc" "example" {
  count = var.create_vpc && length(var.vpc_id) == 0 ? 1 : 0
  name       = "${var.vpc_name}"
  cidr_block = "${var.vpc_cidr_block}"
  is_multicast = var.vpc_is_multicast
  dns_servers  = length(var.vpc_dns_servers) > 0 ? var.vpc_dns_servers : null

  tags = merge(
    {
      "Name" = format("%s", "${var.vpc_name}")
    },
    var.vpc_tags,
  )
}

resource "tencentcloud_subnet" "example" {
  count = length(var.vpc_id) == 0 && length(var.subnet_id) == 0 && length(var.subnet_cidr_blocks) > 0 ? length(var.subnet_cidr_blocks) : 0

  availability_zone = var.availability_zone
  name              = format("subnet-%s", count.index + 1)
  vpc_id            = length(var.vpc_id) == 0 && var.create_vpc ? tencentcloud_vpc.example[count.index].id : var.vpc_id[0]
  cidr_block = element(concat(var.subnet_cidr_blocks, [""]), count.index)
  is_multicast      = "${var.subnet_is_multicast}"

  tags = merge(
    {"Name" = format("subnet-%s", count.index + 1)},
    var.subnet_tags,
  )
}

# data "tencentcloud_vpc_subnets" "example" {
#   vpc_id = length(var.vpc_id) == 0 && var.create_vpc ? tencentcloud_vpc.example.*.id : var.vpc_id
#   subnet_id = length(var.subnet_id) == 0 && var.create_vpc ? tencentcloud_subnet.example.*.id : var.subnet_id
# }

resource "tencentcloud_tcr_vpc_attachment" "example" {
  count = var.create_vpc && length(var.subnet_cidr_blocks) > 0 ? length(var.subnet_cidr_blocks) : 0

  instance_id = tencentcloud_tcr_instance.example.id
  vpc_id = length(var.vpc_id) == 0 && var.create_vpc ? tencentcloud_vpc.example[count.index].id : var.vpc_id[0]
  subnet_id = length(var.subnet_id) == 0 && var.create_vpc ? tencentcloud_subnet.example[count.index].id : var.subnet_id[count.index]
}

# data "tencentcloud_tcr_vpc_attachments" "example" {
#   count = var.create_vpc && length(var.subnet_cidr_blocks) > 0 ? length(var.subnet_cidr_blocks) : 0

#   instance_id = tencentcloud_tcr_vpc_attachment.example[count.index].instance_id
# }