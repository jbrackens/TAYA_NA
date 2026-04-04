provider "alicloud" {
  profile                 = var.profile != "" ? var.profile : null
  shared_credentials_file = var.shared_credentials_file != "" ? var.shared_credentials_file : null
  region                  = var.region != "" ? var.region : null
  skip_region_validation  = var.skip_region_validation
}

resource "alicloud_pvtz_zone_record" "private_domain_record" {
  for_each = { for record in var.dns_records : record.rr => record }

  zone_id  = var.zone_id
  rr       = each.value.rr
  type     = each.value.type
  value    = each.value.value
  priority = each.value.priority
}

