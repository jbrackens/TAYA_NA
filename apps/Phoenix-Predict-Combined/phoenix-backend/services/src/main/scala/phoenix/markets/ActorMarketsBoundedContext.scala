package phoenix.markets

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.EntityRef
import akka.util.Timeout
import cats.data.EitherT
import cats.data.OptionT
import cats.syntax.apply._
import cats.syntax.either._
import io.scalaland.chimney.dsl._
import net.logstash.logback.argument.StructuredArguments._
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.Clock
import phoenix.core.ordering.Direction
import phoenix.core.ordering.Direction.Ascending
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.markets.MarketDataConverters._
import phoenix.markets.MarketProtocol.Commands._
import phoenix.markets.MarketProtocol.Responses.Failure.CannotCancelMarketResponse
import phoenix.markets.MarketProtocol.Responses.Failure.CannotFreezeMarketResponse
import phoenix.markets.MarketProtocol.Responses.Failure.CannotResettleMarketResponse
import phoenix.markets.MarketProtocol.Responses.Failure.CannotSettleMarketResponse
import phoenix.markets.MarketProtocol.Responses.Failure.CannotUnfreezeMarketResponse
import phoenix.markets.MarketProtocol.Responses.Failure.DuplicateCancelMarketEventResponse
import phoenix.markets.MarketProtocol.Responses.Failure.DuplicateFreezeMarketEventResponse
import phoenix.markets.MarketProtocol.Responses.Failure.DuplicateSettleMarketEventResponse
import phoenix.markets.MarketProtocol.Responses.Failure.MarketNotInitializedResponse
import phoenix.markets.MarketProtocol.Responses.Failure.SelectionDoesNotExistResponse
import phoenix.markets.MarketProtocol.Responses.MarketResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketCancelledResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketExistsResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketFrozenResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketInfoUpdatedResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketOddsUpdatedResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketResettledResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketSettledResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketStateResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketUnfrozenResponse
import phoenix.markets.MarketProtocol.Responses.Success.MarketUpdatedResponse
import phoenix.markets.MarketProtocol._
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.MarketWithDetails
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.fixtures.FixturesProjectionHandler
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportProtocol.Commands._
import phoenix.markets.sports.SportProtocol.Responses.SportResponse
import phoenix.markets.sports.SportProtocol.Responses.UpdateFixtureResponse
import phoenix.markets.sports.SportProtocol.Responses.UpdateSportResponse
import phoenix.markets.sports.SportProtocol.Responses.{FixtureNotFound => SportFixtureNotFound}
import phoenix.markets.sports._

private class ActorMarketsBoundedContext(system: ActorSystem[_], marketsRepository: MarketsRepository)(implicit
    clock: Clock)
    extends MarketsBoundedContext {
  // TODO (PHXD-592): temporary change, so that we can eliminate other causes
  private implicit val defaultAskTimeout: Timeout = Timeout(10.seconds)

  private lazy val sharding = ClusterSharding(system)

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def createOrUpdateSport(request: UpdateSportRequest)(implicit
      ec: ExecutionContext): Future[SportEntity.SportId] = {
    log.info(s"createOrUpdateSport: $request")
    sportEntityRef(request.sportId.value)
      .ask { sportResponseActorRef: ActorRef[SportResponse] =>
        request.into[UpdateSport].withFieldConst(_.replyTo, sportResponseActorRef).transform
      }
      .transformWith(handleResponse {
        case UpdateSportResponse(id) => id
      })
  }

  override def createOrUpdateFixture(request: UpdateFixtureRequest)(implicit
      ec: ExecutionContext): Future[FixtureResult] = {
    log.info(s"createOrUpdateFixture: $request")
    sportEntityRef(request.sportId.value)
      .ask { fixtureResponseActorRef: ActorRef[SportResponse] =>
        request.into[UpdateFixture].withFieldConst(_.replyTo, fixtureResponseActorRef).transform
      }
      .transformWith(handleResponse {
        case UpdateFixtureResponse(sportId, tournamentId, fixtureId) =>
          FixtureResult(sportId, tournamentId, fixtureId)
      })
  }

  override def updateMatchStatus(request: UpdateMatchStatusRequest)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, MatchStatusResult] = {
    log.info(s"updateMatchStatus: $request")
    EitherT {
      sportEntityRef(request.sportId.value)
        .ask { matchStatusActorRef: ActorRef[SportResponse] =>
          request.into[UpdateMatchStatus].withFieldConst(_.replyTo, matchStatusActorRef).transform
        }
        .transformWith(handleResponse {
          case response: UpdateFixtureResponse =>
            Right(MatchStatusResult(response.sportId, response.fixtureId))
          case SportProtocol.Responses.FixtureNotFound(_, fixtureId) =>
            Left(FixtureNotFound(fixtureId))
        })
    }
  }

  override def updateFixtureInfo(sportId: SportId, fixtureId: FixtureId, request: FixtureInfoUpdateRequest)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, Unit] = {
    log.info(s"updateFixtureInfo: {} {} $request", kv("sportId", sportId.value), kv("fixtureId", fixtureId.value))
    val operationTime = clock.currentOffsetDateTime()
    updateFixtureInfoInEntity(sportId, fixtureId, request, operationTime)
      .leftFlatMap { _ =>
        log.info(
          "updateFixtureInfo {} {} NOT found. Using the marketsRepository",
          kv("sportId", sportId),
          kv("fixtureId", fixtureId))
        updateFixtureInfoInRepository(fixtureId, request, operationTime)
      }
      .map { _ =>
        log.info("updateFixtureInfo {} {} updated.", kv("sportId", sportId), kv("fixtureId", fixtureId))
      }
  }

  override def getFixtures(query: FixtureQuery, startTimeOrderingDirection: Option[Direction], pagination: Pagination)(
      implicit ec: ExecutionContext): Future[PaginatedResult[FixtureNavigationData]] =
    marketsRepository
      .getFixturesWithFilter(
        query,
        Set(MarketVisibility.Featured),
        startTimeOrderingDirection.getOrElse(Ascending),
        pagination)
      .map(_.map(toFixtureNavigationData))

  override def getFixtureDetails(fixtureId: FixtureId, marketVisibilities: Set[MarketVisibility])(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, FixtureDetailData] =
    EitherT(
      marketsRepository
        .findByFixtureId(fixtureId, marketVisibilities)
        .map(_.map(toFixtureDetailData).toRight(FixtureNotFound(fixtureId))))

  override def getFixtureIds(fixtureStatus: Set[FixtureStatus])(implicit ec: ExecutionContext): Future[Seq[FixtureId]] =
    marketsRepository.getFixtureIdsForFixturesWithStatus(fixtureStatus)

  override def createOrUpdateMarket(request: UpdateMarketRequest)(implicit ec: ExecutionContext): Future[MarketId] = {
    log.info(s"createOrUpdateMarket: $request")
    marketRef(request.marketId)
      .ask { marketResponseActorRef: ActorRef[MarketResponse] =>
        request.into[UpdateMarket].withFieldConst(_.replyTo, marketResponseActorRef).transform
      }
      .transformWith(handleResponse {
        case MarketUpdatedResponse(id)     => id
        case MarketOddsUpdatedResponse(id) => id
      })
  }

  override def lastUpdateTimestamp()(implicit ec: ExecutionContext): Future[OffsetDateTime] =
    marketsRepository.getLastUpdateMarkets().map(_.getOrElse(clock.currentOffsetDateTime()))

  override def createOrUpdateMarket(request: CommonUpdateMarketRequest)(implicit
      ec: ExecutionContext): Future[MarketId] = {
    log.info(s"createOrUpdateMarket: $request")
    marketRef(request.marketId)
      .ask { marketResponseActorRef: ActorRef[MarketResponse] =>
        request
          .into[UpdateMarket]
          .withFieldConst(_.replyTo, marketResponseActorRef)
          .withFieldComputed(_.marketSpecifiers, extractSpecifiers)
          .transform
      }
      .transformWith(handleResponse {
        case MarketUpdatedResponse(id)     => id
        case MarketOddsUpdatedResponse(id) => id
      })
  }

  private def extractSpecifiers(request: CommonUpdateMarketRequest): Seq[MarketSpecifier] =
    Seq(
      request.marketSpecifiers.value.map(v => MarketSpecifier("value", v.value)),
      request.marketSpecifiers.map.map(m => MarketSpecifier("map", m.value)),
      request.marketSpecifiers.unit.map(u => MarketSpecifier("unit", u.value))).flatten

  override def updateSelectionOdds(marketId: MarketId, selectionOdds: Seq[SelectionOdds])(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit] = {
    log.info(s"updateSelectionOdds: {} $selectionOdds", kv("marketId", marketId.value))
    for {
      _ <- EitherT(ensureMarketExists(marketId))
      _ <- EitherT[Future, MarketNotFound, Unit] {
        marketRef(marketId)
          .ask(replyTo => Commands.UpdateSelectionOdds(marketId, selectionOdds, clock.currentOffsetDateTime(), replyTo))
          .transformWith(handleResponse {
            case MarketOddsUpdatedResponse(_) => Right(())
          })
      }
    } yield ()
  }

  override def listAllSports()(implicit ec: ExecutionContext): Future[Seq[SportView]] =
    marketsRepository.getAllSportListings()

  override def getMarketState(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket] =
    EitherT {
      marketRef(marketId)
        .ask(replyTo => Commands.GetMarketState(marketId, replyTo))
        .transformWith(handleResponse {
          case MarketStateResponse(state)       => Right(state)
          case MarketNotInitializedResponse(id) => Left(MarketNotFound(id))
        })
    }

  override def getDgeAllowedMarketState(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket] =
    OptionT(marketsRepository.getMarketWithDetails(marketId, displayableOnly = true))
      .toRight(MarketNotFound(marketId)) *> getMarketState(marketId)

  override def getMarket(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, MarketAggregate] =
    OptionT(marketsRepository.getMarketWithDetails(marketId)).map(buildAggregate).toRight(MarketNotFound(marketId))

  private def buildAggregate(marketWithDetails: MarketWithDetails) =
    MarketAggregate(
      marketWithDetails.market.marketId,
      marketWithDetails.market.name,
      SportSummary(marketWithDetails.sport.sportId, marketWithDetails.sport.name),
      TournamentSummary(marketWithDetails.tournament.tournamentId, marketWithDetails.tournament.name),
      FixtureSummary(
        marketWithDetails.fixture.fixtureId,
        marketWithDetails.fixture.name,
        marketWithDetails.fixture.startTime,
        marketWithDetails.fixture.lifecycleStatus),
      marketWithDetails.market.currentLifecycle,
      marketWithDetails.market.selectionOdds)

  def listTradingFixtures(query: FixtureQuery, startTimeOrderingDirection: Option[Direction], pagination: Pagination)(
      implicit ec: ExecutionContext): Future[PaginatedResult[TradingFixtureDetails]] =
    marketsRepository
      .getFixturesWithFilter(
        query,
        MarketVisibility.values.toSet,
        startTimeOrderingDirection.getOrElse(Ascending),
        pagination)
      .map { paginatedResult =>
        paginatedResult.map(toTradingFixtureDetails)
      }

  def getTradingFixture(fixtureId: FixtureId)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, TradingFixtureDetails] =
    EitherT(
      marketsRepository
        .findByFixtureId(fixtureId, MarketVisibility.values.toSet)
        .map(_.map(toTradingFixtureDetails).toRight(FixtureNotFound(fixtureId))))

  private def ensureMarketExists(marketId: MarketId)(implicit
      ec: ExecutionContext): Future[Either[MarketNotFound, Unit]] =
    marketRef(marketId)
      .ask(replyTo => CheckIfMarketExists(marketId, replyTo))
      .transformWith(handleResponse {
        case MarketExistsResponse(_)         => Right(())
        case MarketNotInitializedResponse(_) => Left(MarketNotFound(marketId))
      })

  private def marketRef(marketId: MarketId): EntityRef[Commands.MarketCommand] =
    sharding.entityRefFor(MarketShardingRegion.TypeKey, marketId.value)

  private def sportEntityRef(sportId: String): EntityRef[SportCommand] =
    sharding.entityRefFor(SportsShardingRegion.TypeKey, sportId)

  private def handleResponse[RESPONSE, A](pf: PartialFunction[RESPONSE, A]): Try[RESPONSE] => Future[A] = {
    case Success(response) =>
      pf.lift(response)
        .map(result => Future.successful(result))
        .getOrElse(
          Future.failed(UnexpectedMarketErrorException(new IllegalStateException(s"Received message $response"))))
    case Failure(exception) => Future.failed(UnexpectedMarketErrorException(exception))
  }

  private def updateFixtureInfoInRepository(
      fixtureId: FixtureId,
      request: FixtureInfoUpdateRequest,
      operationTime: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, FixtureNotFound, Unit] =
    EitherT {
      for {
        fixtureOpt <- marketsRepository.findByFixtureId(fixtureId, MarketVisibility.values.toSet)
        result <- fixtureOpt match {
          case Some(fixtureData) =>
            marketsRepository
              .addFixtureLifecycleStatusChange(
                fixtureData.fixture.fixtureId,
                MarketsBoundedContext.FixtureLifecycleStatusChange(request.fixtureStatus.get, operationTime))
              .map(_ => Right(()))
          case None => Future.successful(Left(FixtureNotFound(fixtureId)))
        }
      } yield result
    }

  private def updateFixtureInfoInEntity(
      sportId: SportId,
      fixtureId: FixtureId,
      request: FixtureInfoUpdateRequest,
      operationTime: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, FixtureNotFound, Unit] =
    EitherT {
      sportEntityRef(sportId.value)
        .ask { sportResponseActorRef: ActorRef[SportResponse] =>
          UpdateFixtureInfo(
            correlationId = UUID.randomUUID().toString,
            receivedAtUtc = operationTime,
            sportId = sportId,
            fixtureId = fixtureId,
            fixtureName = request.fixtureName,
            fixtureLifecycleStatus = request.fixtureStatus,
            fixtureStartTime = request.fixtureStartTime,
            fixtureUpdatedAt = operationTime,
            replyTo = sportResponseActorRef)
        }
        .transformWith(handleResponse {
          case UpdateFixtureResponse(_, _, _)     => Right(())
          case SportFixtureNotFound(_, fixtureId) => Left(FixtureNotFound(fixtureId))
        })
    }

  override def getTradingMarkets(pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[TradingMarketNavigationData]] =
    marketsRepository.getMarketsWithFilter(pagination).map { paginatedResult =>
      paginatedResult.map(toTradingMarketNavigationData)
    }

  override def getTradingMarket(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, TradingMarketNavigationData] =
    EitherT {
      marketsRepository
        .getMarketWithDetails(marketId)
        .map(maybeMarket => maybeMarket.toRight[MarketNotFound](MarketNotFound(marketId)))
    }.map(toTradingMarketNavigationData)

  override def updateMarketInfo(marketId: MarketId, request: MarketInfoUpdateRequest)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit] = {
    log.info(s"updateMarketInfo: {} $request", kv("marketId", marketId.value))
    EitherT {
      marketRef(marketId)
        .ask(replyTo => UpdateMarketInfo(marketId, request.marketName, clock.currentOffsetDateTime(), replyTo))
        .transformWith(handleResponse {
          case MarketInfoUpdatedResponse(_)    => Right(())
          case MarketNotInitializedResponse(_) => Left(MarketNotFound(marketId))
        })
    }
  }

  override def changeVisibility(sportId: SportId, marketCategory: MarketCategory, marketVisibility: MarketVisibility)(
      implicit ec: ExecutionContext): EitherT[Future, Nothing, Unit] = {
    log.info(
      "changeVisibility: {} {} to {}",
      kv("sportId", sportId.value),
      kv("category", marketCategory.value),
      kv("visibility", marketVisibility.entryName))
    EitherT(marketsRepository.changeVisibility(sportId, marketCategory, marketVisibility).map(_.asRight[Nothing]))
  }

  override def getMarketCategories(sportId: SportId, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[MarketCategoryVisibility]] =
    marketsRepository.getMarketCategories(sportId, pagination)

  override def settleMarket(
      marketId: MarketId,
      winningSelectionId: SelectionId,
      reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketSettlingError, Unit] = {
    log.info(
      "settleMarket: {} {} {}",
      kv("marketId", marketId.value),
      kv("winningSelection", winningSelectionId),
      kv("reason", reason))
    EitherT {
      marketRef(marketId)
        .ask(replyTo => SettleMarket(marketId, winningSelectionId, reason, clock.currentOffsetDateTime(), replyTo))
        .transformWith(handleResponse {
          case MarketNotInitializedResponse(id)                    => Left(MarketNotFound(id))
          case SelectionDoesNotExistResponse(id, selectionId)      => Left(SelectionNotFound(id, selectionId))
          case CannotSettleMarketResponse(id, selectionId)         => Left(CannotSettleMarket(id, selectionId))
          case DuplicateSettleMarketEventResponse(id, selectionId) => Left(DuplicateSettleMarketEvent(id, selectionId))
          case MarketSettledResponse(_)                            => Right(())
        })
    }
  }

  override def resettleMarket(
      marketId: MarketId,
      newWinningSelectionId: SelectionId,
      reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketResettlingError, Unit] = {
    log.info(
      "resettleMarket: {} {} {}",
      kv("marketId", marketId.value),
      kv("winningSelection", newWinningSelectionId),
      kv("reason", reason))
    EitherT {
      marketRef(marketId)
        .ask(replyTo => ResettleMarket(marketId, newWinningSelectionId, reason, clock.currentOffsetDateTime(), replyTo))
        .transformWith(handleResponse {
          case MarketNotInitializedResponse(id)               => Left(MarketNotFound(id))
          case SelectionDoesNotExistResponse(id, selectionId) => Left(SelectionNotFound(id, selectionId))
          case CannotResettleMarketResponse(id, selectionId)  => Left(CannotResettleMarket(id, selectionId))
          case MarketResettledResponse(_)                     => Right(())
        })
    }
  }

  override def cancelMarket(marketId: MarketId, reason: LifecycleCancellationReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketCancellingError, Unit] = {
    log.info("cancelMarket: {} {}", kv("marketId", marketId.value), kv("reason", reason))
    EitherT {
      marketRef(marketId)
        .ask(replyTo => CancelMarket(marketId, reason, clock.currentOffsetDateTime(), replyTo))
        .transformWith(handleResponse {
          case MarketNotInitializedResponse(id)       => Left(MarketNotFound(id))
          case CannotCancelMarketResponse(id)         => Left(CannotCancelMarket(id))
          case DuplicateCancelMarketEventResponse(id) => Left(DuplicateCancelMarketEvent(id))
          case MarketCancelledResponse(_)             => Right(())
        })
    }
  }

  override def freezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketFreezingError, Unit] = {
    log.info("freezeMarket: {} {}", kv("marketId", marketId.value), kv("reason", reason))
    EitherT {
      marketRef(marketId)
        .ask(replyTo => FreezeMarket(marketId, reason, clock.currentOffsetDateTime(), replyTo))
        .transformWith(handleResponse {
          case MarketNotInitializedResponse(id)       => Left(MarketNotFound(id))
          case CannotFreezeMarketResponse(id)         => Left(CannotFreezeMarket(id))
          case DuplicateFreezeMarketEventResponse(id) => Left(DuplicateFreezeMarketEvent(id))
          case MarketFrozenResponse(_)                => Right(())
        })
    }
  }

  override def unfreezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketUnfreezingError, Unit] = {
    log.info("unfreezeMarket: {} {}", kv("marketId", marketId.value), kv("reason", reason))
    EitherT {
      marketRef(marketId)
        .ask(replyTo => UnfreezeMarket(marketId, reason, clock.currentOffsetDateTime(), replyTo))
        .transformWith(handleResponse {
          case MarketNotInitializedResponse(id) => Left(MarketNotFound(id))
          case CannotUnfreezeMarketResponse(id) => Left(CannotUnfreezeMarket(id))
          case MarketUnfrozenResponse(_)        => Right(())
        })
    }
  }

  override def makeTournamentDisplayable(tournamentId: SportEntity.TournamentId)(implicit
      ec: ExecutionContext): Future[Unit] = {
    log.info("Making {} displayable to punters", kv("tournamentId", tournamentId.value))
    marketsRepository.saveDisplayableTournament(DisplayableTournament(tournamentId)).map(_ => ())
  }

  override def makeTournamentNotDisplayable(tournamentId: SportEntity.TournamentId)(implicit
      ec: ExecutionContext): Future[Unit] = {
    log.info("Making tournament {} NOT displayable to punters", kv("tournamentId", tournamentId.value))
    marketsRepository.deleteDisplayableTournament(tournamentId: SportEntity.TournamentId).map(_ => ())
  }
}

object ActorMarketsBoundedContext {
  private val log = LoggerFactory.getLogger(getClass)

  def apply(system: ActorSystem[_], dbConfig: DatabaseConfig[JdbcProfile])(implicit
      clock: Clock): MarketsBoundedContext = {

    log.info("Markets BoundedContext starting...")

    val marketsConfig = MarketsConfig.of(system)

    MarketShardingRegion.initSharding(system, MarketTags.marketTags)
    SportsShardingRegion.initSharding(marketsConfig.filters, clock, system)

    val marketsRepository =
      new MarketsRepository(
        dbConfig,
        selectionOddsUpperBoundInclusive = marketsConfig.selectionOddsUpperBoundInclusive,
        marketsConfig.filters)

    MarketProjectionRunner
      .build(system, dbConfig)
      .runProjection(
        marketsConfig.projections.allAvailableMarkets,
        new MarketsProjectionHandler(system, marketsRepository))

    SportsProjectionRunner
      .build(system, dbConfig)
      .runProjection(
        marketsConfig.projections.allAvailableSports,
        new SportsProjectionHandler(system, marketsRepository))

    SportsProjectionRunner
      .build(system, dbConfig)
      .runProjection(
        marketsConfig.projections.allAvailableFixtures,
        new FixturesProjectionHandler(system, marketsRepository))

    new ActorMarketsBoundedContext(system, marketsRepository)
  }
}
