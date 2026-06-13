package phoenix.http.routes

import io.circe.Decoder
import io.circe.Encoder
import sttp.tapir.EndpointInput
import sttp.tapir.EndpointOutput
import sttp.tapir.Schema
import sttp.tapir.json.circe.{jsonBody => tapirJsonBody}

object HttpBody {
  final class JsonBody[T](val schema: Schema[T]) {}
  object JsonBody {
    implicit def input[T: Decoder](jb: JsonBody[T]): EndpointInput[T] = {
      implicit val schema: Schema[T] = jb.schema
      implicit val encoder: Encoder[T] = Encoder.instance { (_: T) =>
        throw new RuntimeException("Write not supported right now")
      }
      tapirJsonBody[T]
    }
    implicit def output[T: Encoder](jb: JsonBody[T]): EndpointOutput[T] = {
      implicit val schema: Schema[T] = jb.schema
      implicit val decoder: Decoder[T] = Decoder.failedWithMessage("Read not supported right now")
      tapirJsonBody[T]
    }
  }

  /**
   * This is a special kind of parameter instructing Tapir to use the existing `Encoder[T]` and `Decoder[T]`
   * to write/read the type T as a body of a HTTP response/request. Unlike Tapir's built-in function of the
   * same name, this one delays picking of `Encoder` and `Decoder` instances, so that it can be used even if
   * only one of those is available.
   */
  def jsonBody[T: Schema]: JsonBody[T] = new JsonBody[T](implicitly[Schema[T]])

}
