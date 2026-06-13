package phoenix.http.core

import scala.concurrent.Future

import sttp.tapir.AnyEndpoint
import sttp.tapir.server.PartialServerEndpoint

final case class SwaggerDefinition(endpoints: Seq[AnyEndpoint]) {
  def ++(other: SwaggerDefinition): SwaggerDefinition = SwaggerDefinition(this.endpoints ++ other.endpoints)
}

object SwaggerDefinition {
  def apply(first: AnyEndpoint, others: AnyEndpoint*): SwaggerDefinition =
    SwaggerDefinition(Seq(first) ++ others)

  def apply(
      first: PartialServerEndpoint[_, _, _, _, _, _, Future],
      others: PartialServerEndpoint[_, _, _, _, _, _, Future]*): SwaggerDefinition =
    SwaggerDefinition((Seq(first) ++ others).map(_.endpoint))
}
