package phoenix.shared

import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec

object Failures {

  final case class ResponseError(errorCode: String, details: Option[String])
  final case class FailedResponse(errors: Seq[ResponseError])

  implicit val responseErrorCodec: Codec[ResponseError] = deriveCodec
  implicit val failedResponseCodec: Codec[FailedResponse] = deriveCodec
}