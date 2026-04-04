package stella.common.http.jwt

sealed trait Permissions {
  def hasPermission(permission: Permission): Boolean
}

trait Permission {
  def value: String
}

final case class PermissionsCollection(values: Set[String]) extends Permissions {
  override def hasPermission(permission: Permission): Boolean = values.contains(permission.value)
}

object FullyPermissivePermissions extends Permissions {
  override def hasPermission(permission: Permission): Boolean = true
}
