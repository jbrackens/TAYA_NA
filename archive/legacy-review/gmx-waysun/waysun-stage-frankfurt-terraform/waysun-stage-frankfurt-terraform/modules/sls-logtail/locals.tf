locals {
  user_data              = <<EOF
#!/bin/sh
wget http://logtail-release-${data.alicloud_regions.this.ids.0}.oss-${data.alicloud_regions.this.ids.0}-internal.aliyuncs.com/linux64/logtail.sh -O logtail.sh; chmod 755 logtail.sh; ./logtail.sh install ${data.alicloud_regions.this.ids.0}
touch /etc/ilogtail/users/${data.alicloud_account.this.id}
EOF
  random_string          = replace(random_uuid.this.result, "-", "")
  log_machine_group_name = "sls-logtail-module-group-${local.random_string}"
  config_name            = "sls-logtail-module-config-${local.random_string}"
}

data "alicloud_account" "this" {}

resource "random_uuid" "this" {}

data "alicloud_regions" "this" {
  current = true
}