package stella.common.utils

import stella.common.http.jwt.Permission
import stella.common.http.jwt.PermissionsCollection

object SampleObjectFactory {

  val emptyPermissionsCollection: PermissionsCollection = PermissionsCollection(Set.empty)

  def testPermission(permissionValue: String): Permission = new Permission {
    override val value: String = permissionValue
  }
}
