package gmx.users.internal.logic

import gmx.common.internal.scala.json.JEnumConverters
import gmx.dataapi.internal.customer.{ DepositLimitScopeEnum, DepositPaymentMethodEnum, DepositStatusEnum }
import gmx.users.internal.aggregate._
import play.api.libs.json.{ Format, Json }

/**
 * Format for the UserState.
 *
 * Persisted entities get snapshotted every configured number of events. This
 * means the state gets stored to the database, so that when the aggregate gets
 * loaded, you don't need to replay all the events, just the ones since the
 * snapshot. Hence, a JSON format needs to be declared so that it can be
 * serialized and deserialized when storing to and from the database.
 */
object StateJsonConverters {

  implicit val formatDepositLimitScopeEnum: Format[DepositLimitScopeEnum] = JEnumConverters.enumFormat(DepositLimitScopeEnum.valueOf)
  implicit val formatDepositPaymentMethodEnum: Format[DepositPaymentMethodEnum] =
    JEnumConverters.enumFormat(DepositPaymentMethodEnum.valueOf)
  implicit val formatDepositStatusEnum: Format[DepositStatusEnum] = JEnumConverters.enumFormat(DepositStatusEnum.valueOf)

  implicit val formatSetBy: Format[SetBy]                     = Json.format
  implicit val formatDepositLimit: Format[DepositLimit]       = Json.format
  implicit val formatTimeOut: Format[TimeOut]                 = Json.format
  implicit val formatCustomerSession: Format[CustomerSession] = Json.format
  implicit val formatLoggedIn: Format[LoggedIn]               = Json.format
  implicit val formatLoggedOut: Format[LoggedOut]             = Json.format
  implicit val formatDeposit: Format[Deposit]                 = Json.format
  implicit val formatWithdrawal: Format[Withdrawal]           = Json.format
  implicit val formatBonusRequest: Format[BonusRequest]       = Json.format
  implicit val formatSelfAssessment: Format[SelfAssessment]   = Json.format
  implicit val formatSportsBet: Format[SportsBet]             = Json.format
  implicit val formatCasinoBet: Format[CasinoBet]             = Json.format
  implicit val formatBetResult: Format[BetResult]             = Json.format
  implicit val formatUserState: Format[UserState]             = Json.format

}
