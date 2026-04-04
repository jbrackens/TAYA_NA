provider "alicloud" {
  profile                 = var.profile != "" ? var.profile : null
  shared_credentials_file = var.shared_credentials_file != "" ? var.shared_credentials_file : null
  region                  = var.region != "" ? var.region : null
  skip_region_validation  = var.skip_region_validation
  configuration_source    = "terraform-alicloud-modules/sls/alicloud"
}

resource "alicloud_log_project" "this" {
  count       = var.create ? 1 : 0
  name        = var.project_name == "" ? local.project_name : local.result_name
  description = var.description 
}

resource "alicloud_log_store" "this" {
  count                 = var.create ? 1 : 0
  name                  = var.store_name == "" ? local.store_name : var.store_name
  project               = concat(alicloud_log_project.this.*.name, [""])[0]
  retention_period      = var.store_retention_period
  shard_count           = var.store_shard_count
  auto_split            = var.store_auto_split
  max_split_shard_count = var.store_max_split_shard_count
  append_meta           = var.store_append_meta
  enable_web_tracking   = var.store_enable_web_tracking

}

resource "alicloud_log_store_index" "this" {
  count    = var.create ? 1 : 0
  logstore = concat(alicloud_log_store.this.*.name, [""])[0]
  project  = concat(alicloud_log_project.this.*.name, [""])[0]
  dynamic "full_text" {
    for_each = var.index_full_text
    content {
      case_sensitive  = lookup(full_text.value, "case_sensitive", false)
      include_chinese = lookup(full_text.value, "include_chinese", false)
      token           = lookup(full_text.value, "token", null)
    }
  }

  dynamic "field_search" {
    for_each = var.index_field_search
    content {
      name             = field_search.value.name
      type             = lookup(field_search.value, "type", "long")
      alias            = lookup(field_search.value, "alias", null)
      case_sensitive   = lookup(field_search.value, "case_sensitive", false)
      include_chinese  = lookup(field_search.value, "include_chinese", false)
      token            = lookup(field_search.value, "token", null)
      enable_analytics = lookup(field_search.value, "enable_analytics", true)
      dynamic "json_keys" {
        for_each = lookup(field_search.value, "json_keys", [])
        content {
          name      = json_keys.value.name
          type      = lookup(json_keys.value, "type", "long")
          alias     = lookup(json_keys.value, "alias", null)
          doc_value = lookup(json_keys.value, "doc_value", true)
        }
      }
    }
  }
}
