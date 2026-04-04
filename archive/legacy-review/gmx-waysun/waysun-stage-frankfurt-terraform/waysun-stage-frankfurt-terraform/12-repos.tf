/*  Container repository  */

resource "alicloud_cr_repo" "gmx-waysun-oidc" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-oidc"
  summary   = "gmx-waysun-oidc"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-virtual-store" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-virtual-store"
  summary   = "gmx-waysun-virtual-store"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-user-context" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-user-context"
  summary   = "gmx-waysun-user-context"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-keycloak" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-keycloak"
  summary   = "gmx-waysun-keycloak"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-cmok" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-cmok"
  summary   = "gmx-waysun-cmok"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-identity-provider" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-identity-provider"
  summary   = "gmx-waysun-identity-provider"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-event-ingestor" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-event-ingestor"
  summary   = "gmx-waysun-event-ingestor"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "rule-configurator" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "rule-configurator"
  summary   = "rule-configurator"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-leaderboard" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-leaderboard"
  summary   = "gmx-waysun-leaderboard"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}

resource "alicloud_cr_repo" "gmx-waysun-achievement" {
  namespace = alicloud_cr_namespace.waysun-namespace.name
  name      = "gmx-waysun-achievement"
  summary   = "gmx-waysun-achievement"
  repo_type = var.general_repo_type
  detail    = var.general_repo_detail
}
