package stella.common.http.jwt

import sttp.client3.Identity
import sttp.client3.Request
import sttp.client3.Response
import sttp.client3.SttpBackend

trait SttpRequestSender {
  def send[T, R](request: Request[T, R], backend: SttpBackend[Identity, R]): Response[T]
}

object SttpRequestSenderImpl extends SttpRequestSender {
  def send[T, R](request: Request[T, R], backend: SttpBackend[Identity, R]): Response[T] =
    request.send(backend)
}
