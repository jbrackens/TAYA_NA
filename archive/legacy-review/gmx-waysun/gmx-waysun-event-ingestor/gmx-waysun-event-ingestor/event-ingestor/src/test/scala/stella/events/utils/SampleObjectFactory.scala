package stella.events.utils

import java.util.UUID

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.kafka.KafkaPublicationInfo

object SampleObjectFactory {

  val inactiveAuthTokenErrorResponse: Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(PresentationErrorCode.InactiveAuthToken))

  val invalidAuthTokenErrorResponse: Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(PresentationErrorCode.InvalidAuthToken))

  val missingPermissionsErrorResponse: Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(PresentationErrorCode.MissingPermissions))

  val internalErrorResponse: Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(PresentationErrorCode.InternalError))

  val forbiddenErrorResponse: Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(PresentationErrorCode.Forbidden))

  def submitEventDebugSuccessResponse(info: KafkaPublicationInfo): Response[Option[KafkaPublicationInfo]] =
    Response.asSuccess(Some(info))

  def randomUserId(): String = UUID.randomUUID().toString
  def randomProjectId(): UUID = UUID.randomUUID()
}
