package phoenix.markets.infrastructure.http

import scala.concurrent.ExecutionContext

import cats.syntax.either._
import sttp.model.StatusCode

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext._

final class MarketRoutes(marketsContext: MarketsBoundedContext)(implicit ec: ExecutionContext) extends Routes {

  val sports = MarketEndpoints.sports.serverLogic { _ =>
    marketsContext.listAllSports().map(_.asRight[ErrorOut])
  }

  val fixtures = MarketEndpoints.fixtures.serverLogic {
    case (fixtureQuery, orderingDirection, pagination) =>
      marketsContext.getFixtures(fixtureQuery, orderingDirection, pagination).map(_.asRight[ErrorOut])
  }

  val fixtureDetails = MarketEndpoints.fixtureDetails.serverLogic {
    case (_, fixtureId) =>
      marketsContext
        .getFixtureDetails(fixtureId, Set(MarketVisibility.Featured, MarketVisibility.Enabled))
        .leftMap((_: FixtureNotFound) =>
          ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.FixtureNotFound))
        .value
  }

  override val endpoints: Routes.Endpoints = List(fixtures, fixtureDetails, sports)
}

object MarketRoutes {
  def extractMarketQuery(queryParams: Map[String, String]): MarketNavigationQuery = {
    val SportsFilter = "filters.sportId"
    MarketNavigationQuery(queryParams.get(SportsFilter))
  }
}
