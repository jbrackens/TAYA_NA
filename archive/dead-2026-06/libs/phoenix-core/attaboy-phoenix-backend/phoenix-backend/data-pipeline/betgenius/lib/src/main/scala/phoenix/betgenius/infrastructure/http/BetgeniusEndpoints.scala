package phoenix.betgenius.infrastructure.http
import sttp.model.StatusCode
import sttp.tapir.PublicEndpoint
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

object BetgeniusEndpoints extends TapirCodecEnumeratum {

  val heartbeat: PublicEndpoint[Unit, Unit, Unit, Any] =
    endpoint.post.in("heartbeat").out(statusCode(StatusCode.Ok))

  def ingest: PublicEndpoint[String, StatusCode, Unit, Any] =
    endpoint.post.in("ingest").in(stringBody).errorOut(statusCode).out(statusCode(StatusCode.Ok))
}
