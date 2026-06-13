package phoenix.jwt

import org.keycloak.representations.AccessToken

import phoenix.jwt.Permissions.UserId
import phoenix.jwt.Permissions.Username

case class Permissions(userId: UserId, username: Username, isAdmin: Boolean)

object Permissions {

  final case class UserId(value: String)
  final case class Username(value: String)

  def fromAccessToken(accessToken: AccessToken): Permissions = {
    val userId = accessToken.getSubject
    val username = accessToken.getPreferredUsername
    val isAdmin = Option(accessToken.getRealmAccess).exists(_.isUserInRole("admin"))

    Permissions(UserId(userId), Username(username), isAdmin)
  }
}
