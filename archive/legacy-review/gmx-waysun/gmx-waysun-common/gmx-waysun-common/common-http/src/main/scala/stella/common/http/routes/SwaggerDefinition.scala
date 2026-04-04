package stella.common.http.routes

import scala.concurrent.Future

import sttp.tapir.Endpoint
import sttp.tapir.server.PartialServerEndpoint

final case class SwaggerDefinition(endpoints: List[Endpoint[_, _, _, _, _]]) {
  def ++(other: SwaggerDefinition): SwaggerDefinition = SwaggerDefinition(this.endpoints ++ other.endpoints)
}

object SwaggerDefinition {
  def apply(first: Endpoint[_, _, _, _, _], others: Endpoint[_, _, _, _, _]*): SwaggerDefinition =
    SwaggerDefinition(List(first) ++ others)

  def apply(
      first: PartialServerEndpoint[_, _, _, _, _, _, Future],
      others: PartialServerEndpoint[_, _, _, _, _, _, Future]*): SwaggerDefinition =
    SwaggerDefinition((List(first) ++ others).map(_.endpoint))
}
