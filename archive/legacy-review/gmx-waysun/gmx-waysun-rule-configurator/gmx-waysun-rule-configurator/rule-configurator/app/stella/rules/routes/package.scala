package stella.rules
import scala.concurrent.Future

import cats.data.EitherT
import sttp.model.StatusCode

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.routes.TapirAuthDirectives.ErrorOut

package object routes {

  val eitherTUnit: EitherT[Future, (StatusCode, Response[ErrorOutput]), Unit] = {
    EitherT[Future, ErrorOut, Unit](Future.successful(Right(())))
  }

}
