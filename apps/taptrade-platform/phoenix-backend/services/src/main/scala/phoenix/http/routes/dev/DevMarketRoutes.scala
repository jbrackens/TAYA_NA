package phoenix.http.routes.dev

import java.util.UUID

import scala.concurrent.ExecutionContext

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.server.Route
import cats.syntax.either._
import sttp.model.StatusCode
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter

import phoenix.core.Clock
import phoenix.core.error.ErrorResponse
import phoenix.http.core.SwaggerDefinition
import phoenix.http.routes.dev.DevMarketEndpoints.CreateMarketForm
import phoenix.markets._
import phoenix.markets.sports.SportEntity.FixtureId

final class DevMarketRoutes(marketsContext: MarketsBoundedContext)(implicit system: ActorSystem[_], clock: Clock) {

  private implicit val ec: ExecutionContext = system.executionContext

  val addMarket =
    DevMarketEndpoints.addMarketEndpoint.serverLogic(form =>
      marketsContext.createOrUpdateMarket(marketRequest(form)).map(_.value).map(_.asRight[(StatusCode, ErrorResponse)]))

  val getMarketState =
    DevMarketEndpoints.getMarketState.serverLogic(marketId =>
      marketsContext.getMarketState(marketId).fold(_.toString, _.toString).map(_.asRight[Unit]))

  val swaggerDefinition: SwaggerDefinition = DevMarketEndpoints.swaggerDefinition

  val toAkkaHttp: Route = AkkaHttpServerInterpreter().toRoute(List(addMarket, getMarketState))

  private def marketRequest(form: CreateMarketForm) =
    UpdateMarketRequest(
      correlationId = UUID.randomUUID().toString,
      receivedAtUtc = clock.currentOffsetDateTime(),
      fixtureId = FixtureId.unsafeParse(form.fixtureId),
      marketId = form.marketId,
      marketName = form.marketName,
      marketType = form.marketType,
      marketCategory = form.marketCategory,
      marketLifecycle = form.marketStatus,
      marketSpecifiers = Seq.empty,
      selectionOdds = form.selectionOdds)
}
