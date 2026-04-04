module "basic-sls-module" {
  source                      = "../.."
  create                      = true
  project_name                = "basic-project-name"
  store_name                  = "basic-store-name"
  store_retention_period      = 30
  store_shard_count           = 2
  store_auto_split            = true
  store_max_split_shard_count = 1
  store_append_meta           = true
  store_enable_web_tracking   = false
  index_full_text = [
    {
      case_sensitive  = false
      include_chinese = false
      token           = "#"
    }
  ]
  index_field_search = [
    {
      name             = "basic"
      type             = "long"
      alias            = "basic1"
      case_sensitive   = true
      include_chinese  = true
      token            = "#"
      enable_analytics = "true"
      json_keys = [
        {
          name      = "basic_json_key"
          type      = "long"
          alias     = "basic_json_key1"
          doc_value = true
        }
      ]
    }
  ]
}