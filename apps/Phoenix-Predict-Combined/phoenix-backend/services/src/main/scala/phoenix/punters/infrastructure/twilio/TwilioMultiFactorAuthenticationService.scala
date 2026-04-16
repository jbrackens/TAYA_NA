package phoenix.punters.infrastructure.twilio

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.client.RequestBuilding.Post
import akka.http.scaladsl.model.FormData
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.Uri
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.unmarshalling.Unmarshal
import cats.data.EitherT
import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.generic.semiauto._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.JsonFormats._
import phoenix.http.JsonMarshalling._
import phoenix.http.core.HttpClient
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.SendVerificationCodeFailure
import phoenix.punters.domain.VerificationFailure
import phoenix.punters.infrastructure.twilio.TwilioHttpProtocol.SuccessfulSendVerificationCodeResponse
import phoenix.punters.infrastructure.twilio.TwilioHttpProtocol._
import phoenix.punters.infrastructure.twilio.TwilioMultiFactorAuthenticationService.SMSChannel

final class TwilioMultiFactorAuthenticationService(httpClient: HttpClient, twilioConfig: TwilioConfig)(implicit
    ec: ExecutionContext,
    system: ActorSystem[_])
    extends MultiFactorAuthenticationService {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def sendVerificationCode(
      mobilePhoneNumber: MobilePhoneNumber): EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] = {

    val uri = Uri(
      s"${twilioConfig.verifyApiBaseUrl.value}/v2/Services/${twilioConfig.verificationServiceId.value}/Verifications")
    val entity = FormData("To" -> mobilePhoneNumber.value, "Channel" -> SMSChannel).toEntity

    val httpRequest = Post(uri = uri, entity = entity).withHeaders(
      Authorization(BasicHttpCredentials(twilioConfig.accountServiceId.value, twilioConfig.authToken.value)))

    val result = httpClient
      .sendRequest(httpRequest)
      .flatMap { response =>
        response.status match {
          case StatusCodes.Created =>
            Unmarshal(response.entity)
              .to[SuccessfulSendVerificationCodeResponse]
              .map(response => Right(MultifactorVerificationId(response.sid)))

          case StatusCodes.BadRequest =>
            Unmarshal(response.entity).to[UnsuccessfulResponse].map { parsedResponse =>
              log.error(
                s"Failed trying to send verification code using Twilio - status code: ${response.status}, response: '$parsedResponse'")

              parsedResponse.code match {
                case TwilioHttpProtocol.INVALID_PHONE_NUMBER =>
                  Left(SendVerificationCodeFailure.InvalidPhoneNumber(mobilePhoneNumber.value))
                case _ => Left(SendVerificationCodeFailure.UnknownSendVerificationCodeFailure)
              }
            }

          case StatusCodes.TooManyRequests =>
            Unmarshal(response.entity).to[UnsuccessfulResponse].map { parsedResponse =>
              log.error(
                s"Rate limited when trying to send verification code using Twilio - status code: ${response.status}, response: '$parsedResponse'")

              Left(parsedResponse.code match {
                case TwilioHttpProtocol.MAX_SEND_ATTEMPTS_REACHED => SendVerificationCodeFailure.MaxSendAttemptsReached
                case _                                            => SendVerificationCodeFailure.UnknownSendVerificationCodeFailure
              })
            }

          case otherStatus =>
            // Let's not rely on the JSON format of UnsuccessfulResponse, we might receive a non-conforming response.
            Unmarshal(response.entity).to[String].flatMap { rawResponse =>
              log.error(
                s"Failed trying to send verification code using Twilio - status code: $otherStatus, response: '$rawResponse'")
              Future.successful(Left(SendVerificationCodeFailure.UnknownSendVerificationCodeFailure))
            }
        }
      }
      .recover { e =>
        log.error(s"Failed trying to send verification code using Twilio: ${e.getMessage}")
        Left(SendVerificationCodeFailure.UnknownSendVerificationCodeFailure)
      }

    EitherT(result)
  }

  override def approveVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] = {

    val uri = Uri(
      s"${twilioConfig.verifyApiBaseUrl.value}/v2/Services/${twilioConfig.verificationServiceId.value}/VerificationCheck")
    val entity = FormData("VerificationSid" -> verificationId.value, "Code" -> verificationCode.value).toEntity

    val httpRequest = Post(uri = uri, entity = entity).withHeaders(
      Authorization(BasicHttpCredentials(twilioConfig.accountServiceId.value, twilioConfig.authToken.value)))

    val result = httpClient
      .sendRequest(httpRequest)
      .flatMap { response =>
        response.status match {
          case StatusCodes.OK =>
            Unmarshal(response.entity).to[SuccessfulVerificationCheckResponse].map(_.status).map {
              case TwilioHttpProtocol.Approved => Right(())
              case TwilioHttpProtocol.Pending  => Left(VerificationFailure.IncorrectVerificationCode)
            }

          case StatusCodes.NotFound =>
            Future.successful(Left(VerificationFailure.VerificationExpiredOrAlreadyApproved))

          case StatusCodes.TooManyRequests =>
            Unmarshal(response.entity).to[UnsuccessfulResponse].map { parsedResponse =>
              log.error(
                s"Rate limited to approve verification code using Twilio - status code: ${response.status}, response: '$parsedResponse'")

              Left(parsedResponse.code match {
                case TwilioHttpProtocol.MAX_CHECK_ATTEMPTS_REACHED => VerificationFailure.MaxCheckAttemptsReached
                case _                                             => VerificationFailure.UnknownVerificationFailure
              })
            }

          case otherStatus =>
            // Let's not rely on the JSON format of UnsuccessfulResponse, we might receive a non-conforming response.
            Unmarshal(response.entity).to[String].flatMap { rawResponse =>
              log.error(
                s"Failed trying to approve verification code using Twilio - status code: $otherStatus, response: '$rawResponse'")
              Future.successful(Left(VerificationFailure.UnknownVerificationFailure))
            }
        }
      }
      .recover { e =>
        log.error(s"Failed trying to approve verification code using Twilio: ${e.getMessage}")
        Left(VerificationFailure.UnknownVerificationFailure)
      }
    EitherT(result)
  }
}

object TwilioMultiFactorAuthenticationService {
  final case class TwilioException(msg: String) extends RuntimeException(msg)

  private val SMSChannel = "sms"
}

private object TwilioHttpProtocol {
  final case class SuccessfulSendVerificationCodeResponse(sid: String)

  implicit val successfulSendVerificationCodeResponseCodec: Codec[SuccessfulSendVerificationCodeResponse] = deriveCodec

  sealed trait VerificationCheckStatus
  case object Approved extends VerificationCheckStatus
  case object Pending extends VerificationCheckStatus

  /**
   * Technically, it corresponds to an invalid <b>parameter</b> (e.g. To/Channel), not necessarily phone number -
   * although in our case it can only reasonably correspond to the invalid phone number.
   * See [[https://www.twilio.com/docs/api/errors/60200]] for more details.
   */
  val INVALID_PHONE_NUMBER = 60200

  /**
   * More than 5 attempts to verify MFA code within 10 minutes
   * <b>for the given phone number</b>.
   * See [[https://www.twilio.com/docs/api/errors/60202]] for more docs.
   */
  val MAX_CHECK_ATTEMPTS_REACHED = 60202

  /**
   * More than 5 attempts to send an MFA code within 10 minutes
   * <b>to the given phone number</b>.
   * See [[https://www.twilio.com/docs/api/errors/60203]] for more docs.
   */
  val MAX_SEND_ATTEMPTS_REACHED = 60203

  implicit object VerificationCheckStatusDecoder extends Decoder[VerificationCheckStatus] {
    override def apply(c: HCursor): Decoder.Result[VerificationCheckStatus] =
      c.as[String]
        .flatMap(_ match {
          case "approved" => Right(Approved)
          case "pending"  => Right(Pending)
          case other      => c.fail(s"Unknown value for status: $other")
        })
  }

  final case class SuccessfulVerificationCheckResponse(status: VerificationCheckStatus)

  implicit val successfulVerificationCheckResponseDecoder: Decoder[SuccessfulVerificationCheckResponse] = deriveDecoder

  // format as per https://www.twilio.com/docs/usage/troubleshooting/debugging-your-application#debugging-calls-to-the-rest-api
  final case class UnsuccessfulResponse(code: Int, message: String, more_info: String, status: Int)

  implicit val unsuccessfulResponseCodec: Codec[UnsuccessfulResponse] = deriveCodec
}
