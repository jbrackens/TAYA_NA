package phoenix

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.OAuth2BearerToken
import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

import phoenix.core.JsonFormats.offsetDateTimeCodec

trait PunterRequests extends PunterFormats with HttpSupport {
  private lazy val publicApiUrl = Config.instance.phoenix.publicApiUrl

  def setDepositLimits(request: LimitRequest, accessToken: String): Future[PunterLimitResponse] = {
    log.info(s"Requesting set deposit limits $request")

    postCodec[LimitRequest, PunterLimitResponse](
      s"$publicApiUrl/punters/deposit-limits",
      request,
      Authorization(OAuth2BearerToken(accessToken)))
  }

  def setStakeLimits(request: LimitRequest, accessToken: String): Future[PunterLimitResponse] = {
    log.info(s"Requesting set stake limits $request")

    postCodec[LimitRequest, PunterLimitResponse](
      s"$publicApiUrl/punters/stake-limits",
      request,
      Authorization(OAuth2BearerToken(accessToken)))
  }
}

trait PunterFormats {
  case class LimitRequest(daily: BigDecimal, weekly: BigDecimal, monthly: BigDecimal)
  case class LimitResponse(limit: BigDecimal, since: OffsetDateTime)
  case class CurrentAndNextLimitResponse(current: LimitResponse, next: Option[LimitResponse])
  case class PunterLimitResponse(
      daily: CurrentAndNextLimitResponse,
      weekly: CurrentAndNextLimitResponse,
      monthly: CurrentAndNextLimitResponse)

  implicit val limitRequestCodec: Codec[LimitRequest] = deriveCodec
  implicit val limitResponseCodec: Codec[LimitResponse] = deriveCodec
  implicit val currentAndNextLimitResponseCodec: Codec[CurrentAndNextLimitResponse] = deriveCodec
  implicit val depositLimitResponseCodec: Codec[PunterLimitResponse] = deriveCodec
}
