package gmx.users.internal.logic

import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }
import gmx.users.internal.aggregate._
import play.api.libs.json.{ Format, Json }

object EventsJsonConverters {

  import gmx.users.internal.logic.StateJsonConverters._

  implicit val formatProcessingHeader: Format[ProcessingHeader]               = Json.format
  implicit val formatCustomerHeader: Format[CustomerHeader]                   = Json.format
  implicit val formatDepositLimitSet: Format[DepositLimitSet]                 = Json.format
  implicit val formatTimeOutSet: Format[TimeOutSet]                           = Json.format
  implicit val formatCustomerLoggedIn: Format[CustomerLoggedIn]               = Json.format
  implicit val formatCustomerLoggedOut: Format[CustomerLoggedOut]             = Json.format
  implicit val formatFundsDeposited: Format[FundsDeposited]                   = Json.format
  implicit val formatFundsWithdrawn: Format[FundsWithdrawn]                   = Json.format
  implicit val formatBonusRequested: Format[BonusRequested]                   = Json.format
  implicit val formatSportsBetPlaced: Format[SportsBetPlaced]                 = Json.format
  implicit val formatCasinoBetPlaced: Format[CasinoBetPlaced]                 = Json.format
  implicit val formatBetSettled: Format[BetSettled]                           = Json.format
  implicit val formatSelfAssessmentCompleted: Format[SelfAssessmentCompleted] = Json.format

}
