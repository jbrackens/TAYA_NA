package phoenix.http.routes.dev

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.core.error.ErrorResponse
import phoenix.http.core.SwaggerDefinition
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.markets.MarketCategory
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.SelectionOdds
import phoenix.markets.domain.MarketType
import phoenix.markets.infrastructure.MarketJsonFormats.marketCreateRequestCodec
import phoenix.markets.infrastructure.http.MarketTapirCodecs.marketIdCodec

object DevMarketEndpoints extends TapirCodecEnumeratum {

  final case class CreateMarketForm(
      marketId: MarketId,
      marketName: String,
      marketType: MarketType,
      marketCategory: Option[MarketCategory],
      fixtureId: String,
      marketStatus: MarketLifecycle,
      selectionOdds: List[SelectionOdds])

  val addMarketEndpoint =
    endpoint.post
      .in("markets")
      .in(jsonBody[CreateMarketForm])
      .errorOut(statusCode)
      .errorOut(jsonBody[ErrorResponse])
      .out(statusCode(StatusCode.Created))
      .out(stringBody)

  val getMarketState =
    endpoint.post.in("markets" / path[MarketId]("marketId") / "state").out(statusCode(StatusCode.Ok)).out(stringBody)

  def swaggerDefinition: SwaggerDefinition =
    SwaggerDefinition(addMarketEndpoint, getMarketState)
}
