package phoenix.jwt

import scala.jdk.CollectionConverters._

import org.keycloak.representations.AccessToken

import phoenix.jwt.Permissions.UserId
import phoenix.jwt.Permissions.Username

case class Permissions(
    userId: UserId,
    username: Username,
    isAdmin: Boolean,
    roles: Set[String] = Set.empty) {

  def isTrader: Boolean = roles.contains(Permissions.traderRoleName)
  def isOperator: Boolean = roles.contains(Permissions.operatorRoleName)

  def canViewPredictionOps: Boolean = isAdmin || isTrader || isOperator

  def canViewPredictionAuditTrail: Boolean = isAdmin || isTrader

  def canViewPredictionOrderFlow: Boolean = isAdmin || isTrader

  def canExportPredictionMarketOversight: Boolean = isAdmin || isTrader

  def canExportPredictionOrderFlow: Boolean = canViewPredictionOrderFlow

  def canManagePredictionReversibleState: Boolean = isAdmin || isTrader

  def canManagePredictionMarketState: Boolean = canManagePredictionReversibleState

  def canManagePredictionDestructiveOverrides: Boolean = isAdmin

  def canManagePredictionSettlement: Boolean = isAdmin
}

object Permissions {
  private val adminRoleName = "admin"
  private val traderRoleName = "trader"
  private val operatorRoleName = "operator"

  final case class UserId(value: String)
  final case class Username(value: String)

  def fromAccessToken(accessToken: AccessToken): Permissions = {
    val userId = accessToken.getSubject
    val username = accessToken.getPreferredUsername
    val roles =
      Option(accessToken.getRealmAccess)
        .flatMap(realmAccess => Option(realmAccess.getRoles))
        .map(_.asScala.toSet)
        .getOrElse(Set.empty[String])
    val isAdmin = roles.contains(adminRoleName)

    Permissions(UserId(userId), Username(username), isAdmin, roles)
  }
}
