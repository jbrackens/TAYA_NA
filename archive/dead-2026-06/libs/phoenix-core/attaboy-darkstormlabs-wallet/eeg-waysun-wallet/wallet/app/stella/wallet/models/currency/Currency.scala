package stella.wallet.models.currency

import java.time.OffsetDateTime

import play.api.libs.json.Json
import play.api.libs.json.OFormat
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.common.models.Ids.ProjectId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.CurrencyId._
import stella.wallet.models.Ids.ProjectIdInstances._
import stella.wallet.models.utils.RequestVerificationUtils
import stella.wallet.models.utils.SchemaUtils

trait CurrencyData {
  import CurrencyData._

  val name: String

  val verboseName: String

  val symbol: String

  RequestVerificationUtils.verifyNonBlankString("name", name, maxNameLength)
  RequestVerificationUtils.verifyNonBlankString("verboseName", verboseName, maxVerboseNameLength)
  RequestVerificationUtils.verifyNonBlankString("symbol", symbol, maxSymbolLength)
}

object CurrencyData {
  private[currency] val maxNameLength = 32
  private[currency] val maxVerboseNameLength = 64
  private[currency] val maxSymbolLength = 16

  private[currency] def withCurrencyDataFieldDescription[T <: CurrencyData](schema: Schema[T]): Schema[T] =
    schema
      .modify(_.name)(SchemaUtils.nonBlankStringDescription(CurrencyData.maxNameLength)(_).encodedExample("Gold"))
      .modify(_.verboseName)(
        SchemaUtils.nonBlankStringDescription(CurrencyData.maxVerboseNameLength)(_).encodedExample("Gold Coin"))
      .modify(_.symbol)(SchemaUtils.nonBlankStringDescription(CurrencyData.maxSymbolLength)(_).encodedExample("GLDC"))
}

final case class Currency(
    id: CurrencyId,
    name: String,
    verboseName: String,
    symbol: String,
    associatedProjects: List[ProjectId],
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime)
    extends CurrencyData

object Currency {
  implicit lazy val currencyFormat: RootJsonFormat[Currency] = jsonFormat7(Currency.apply)

  implicit lazy val currencySchema: Schema[Currency] =
    CurrencyData.withCurrencyDataFieldDescription(Schema.derived[Currency])
}

final case class CreateCurrencyWithAssociatedProjectsRequest(
    name: String,
    verboseName: String,
    symbol: String,
    associatedProjects: List[ProjectId])
    extends CurrencyData {

  def withAllowedAssociatedProjects(
      allowedProjectIdsOpt: Option[Set[ProjectId]]): CreateCurrencyWithAssociatedProjectsRequest = {
    allowedProjectIdsOpt match {
      case None => this
      case Some(allowedProjectIds) =>
        this.copy(associatedProjects = associatedProjects.filter(allowedProjectIds.contains))
    }
  }

}

object CreateCurrencyWithAssociatedProjectsRequest {
  implicit lazy val createCurrencyWithAssociatedProjectsRequestFormat
      : RootJsonFormat[CreateCurrencyWithAssociatedProjectsRequest] =
    jsonFormat4(CreateCurrencyWithAssociatedProjectsRequest.apply)

  implicit lazy val createCurrencyWithAssociatedProjectsRequestSchema
      : Schema[CreateCurrencyWithAssociatedProjectsRequest] =
    CurrencyData.withCurrencyDataFieldDescription(Schema.derived[CreateCurrencyWithAssociatedProjectsRequest])

  implicit lazy val createCurrencyWithAssociatedProjectsRequestPlayFormat
      : OFormat[CreateCurrencyWithAssociatedProjectsRequest] =
    Json.format[CreateCurrencyWithAssociatedProjectsRequest]
}

final case class UpdateCurrencyWithAssociatedProjectsRequest(
    name: String,
    verboseName: String,
    symbol: String,
    associatedProjects: List[ProjectId])
    extends CurrencyData {

  def withAllowedAssociatedProjects(
      existingAssociatedProjectIds: List[ProjectId],
      allowedProjectIdsOpt: Option[Set[ProjectId]]): UpdateCurrencyWithAssociatedProjectsRequest = {
    allowedProjectIdsOpt match {
      case None => this
      case Some(allowedProjectIds) =>
        val existingAssociatedProjectsWithoutAccessTo =
          existingAssociatedProjectIds.filterNot(allowedProjectIds.contains)
        val requestedAssociatedProjectsWithAccessTo = associatedProjects.filter(allowedProjectIds.contains)
        this.copy(associatedProjects =
          (existingAssociatedProjectsWithoutAccessTo ++ requestedAssociatedProjectsWithAccessTo).distinct)
    }
  }
}

object UpdateCurrencyWithAssociatedProjectsRequest {
  implicit lazy val updateCurrencyWithAssociatedProjectsRequestFormat
      : RootJsonFormat[UpdateCurrencyWithAssociatedProjectsRequest] =
    jsonFormat4(UpdateCurrencyWithAssociatedProjectsRequest.apply)

  implicit lazy val updateCurrencyWithAssociatedProjectsRequestSchema
      : Schema[UpdateCurrencyWithAssociatedProjectsRequest] =
    CurrencyData.withCurrencyDataFieldDescription(Schema.derived[UpdateCurrencyWithAssociatedProjectsRequest])

  implicit lazy val updateCurrencyWithAssociatedProjectsRequestPlayFormat
      : OFormat[UpdateCurrencyWithAssociatedProjectsRequest] =
    Json.format[UpdateCurrencyWithAssociatedProjectsRequest]
}
