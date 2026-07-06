package phoenix.betgenius.domain

import java.time.OffsetDateTime
import java.util.UUID

import cats.syntax.apply._
import cats.syntax.functor._
import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.scalaland.chimney.Transformer
import io.scalaland.chimney.dsl._

import phoenix.betgenius.domain.BetgeniusSportMapper.BetgeniusSportInformation
import phoenix.dataapi.internal.oddin
import phoenix.dataapi.internal.oddin._
import phoenix.dataapi.shared
import phoenix.dataapi.shared.FixtureChange
import phoenix.dataapi.shared.FixtureResult
import phoenix.dataapi.shared.MarketChange
import phoenix.dataapi.shared.MarketStatus
import phoenix.dataapi.shared.MatchStatusUpdate
import phoenix.dataapi.shared.OddData
import phoenix.dataapi.shared.Score
import phoenix.dataapi.shared.Specifiers

@ConfiguredJsonCodec(decodeOnly = true)
case class Header(messageGuid: UUID, timeStampUtc: OffsetDateTime)

object Header {
  implicit val toSharedHeaderTransformer: Transformer[Header, shared.Header] =
    Transformer
      .define[Header, shared.Header]
      .withFieldComputed(_.correlationId, _.messageGuid.toString)
      .withFieldComputed(_.receivedAtUtc, _.timeStampUtc.toInstant)
      .withFieldConst(_.source, "betgenius")
      .buildTransformer
}

sealed trait Ingest

@ConfiguredJsonCodec(decodeOnly = true)
case class FixtureIngest(header: Header, fixture: Fixture) extends Ingest {

  def toFixtureChangedEvent = {
    val sportInformation =
      BetgeniusSportMapper
        .getSportInformation(fixture.competition.region.id)
        .getOrElse(BetgeniusSportInformation.unknown)
    FixtureChangedEvent(
      header.messageGuid.toString,
      header.timeStampUtc.toInstant.toEpochMilli,
      sportId = fixture.sport.id.namespaced,
      sportName = sportInformation.name,
      sportAbbreviation = sportInformation.abbreviation,
      tournamentId = fixture.season.id.namespaced,
      tournamentName = fixture.season.name.value,
      tournamentStartTimeUtc = fixture.startTimeUtc.toInstant.toEpochMilli,
      fixtureId = fixture.id.namespaced,
      fixtureName = fixture.name.value,
      startTimeUtc = fixture.startTimeUtc.toInstant.toEpochMilli,
      eventStatus = fixture.status.entryName,
      competitors = fixture.competitors.map { competitor =>
        oddin.Competitor(competitor.id.namespaced, competitor.name.value, competitor.homeAway.entryName)
      },
      currentScore = MatchScore(0, 0))
  }
}

object FixtureIngest {
  implicit val toFixtureChangeTransformer: Transformer[FixtureIngest, FixtureChange] = {
    Transformer
      .define[FixtureIngest, FixtureChange]
      .withFieldComputed(_.namespacedId, _.fixture.id.namespaced)
      .withFieldComputed(_.name, _.fixture.name.value)
      .withFieldComputed(_.startTimeUtc, _.fixture.startTimeUtc.toInstant.toEpochMilli)
      .withFieldComputed(
        _.sport,
        { fixtureIngest =>
          val sportInformation =
            BetgeniusSportMapper
              .getSportInformation(fixtureIngest.fixture.competition.region.id)
              .getOrElse(BetgeniusSportInformation.unknown)
          shared.Sport(
            fixtureIngest.fixture.competition.region.id.asSportId.namespaced,
            sportInformation.name,
            sportInformation.abbreviation)
        })
      .withFieldComputed(_.status, _.fixture.status.transformInto[shared.FixtureStatus])
      .withFieldComputed(_.competition, _.fixture.season.transformInto[shared.Competition])
      .withFieldComputed(_.competitors, _.fixture.competitors.transformInto[Seq[shared.Competitor]])
      .buildTransformer
  }
}

@ConfiguredJsonCodec(decodeOnly = true)
case class MarketSetIngest(header: Header, marketSet: MarketSet) extends Ingest

object MarketSetIngest {

  private val mapPattern = ".*Map (\\d+).*".r

  implicit val toMarketChangeTransformer: Transformer[MarketSetIngest, Seq[MarketChange]] =
    (marketSetIngest: MarketSetIngest) => {
      val header = marketSetIngest.header.transformInto[shared.Header]
      val fixtureId = marketSetIngest.marketSet.fixtureId
      marketSetIngest.marketSet.markets.map { market =>
        MarketChange(
          header,
          fixtureId.namespaced,
          shared.Market(
            namespacedId = market.id.namespaced,
            name = market.name.value,
            status = market.tradingStatus.transformInto[MarketStatus],
            `type` = mapMarketType(market.marketType),
            category = None,
            specifiers = extractSpecifiers(market),
            odds = market.selections.transformInto[Seq[OddData]]))
      }
    }

  private def extractSpecifiers(market: Market): Specifiers = {
    val mapSpecifier = market.marketType.name.value match {
      case mapPattern(map) => Some(map)
      case _               => None
    }
    val handicapSpecifier = market.handicap
    val unitSpecifier = market.selections.headOption.flatMap(_.outcome).map(_.name) match {
      case Some(name) if name.contains("Minutes") => Some("minutes")
      case _                                      => None
    }

    Specifiers(handicapSpecifier, mapSpecifier, unitSpecifier)
  }

  private def mapMarketType(marketType: MarketType): String =
    MarketTypeEnum.forMarketTypeName(marketType.name).entryName
}

@ConfiguredJsonCodec(decodeOnly = true)
case class ResultSetIngest(header: Header, resultSet: ResultSet) extends Ingest
object ResultSetIngest {
  implicit val toFixtureResultTransformer: Transformer[ResultSetIngest, Seq[FixtureResult]] =
    (resultSetIngest: ResultSetIngest) => {
      val header = resultSetIngest.header.transformInto[shared.Header]
      resultSetIngest.resultSet.results.map { result =>
        result
          .into[FixtureResult]
          .withFieldConst(_.header, header)
          .withFieldConst(_.namespacedMarketId, result.marketId.namespaced)
          .transform
      }
    }
}

@ConfiguredJsonCodec(decodeOnly = true)
case class CoverageIngest(header: Header, coverage: Coverage) extends Ingest

@ConfiguredJsonCodec(decodeOnly = true)
case class MultiSportIngest(header: Header, multiSportMatchStateV2: MultiSportMatchStateV2) extends Ingest

object MultiSportIngest {
  implicit val toMatchStatusUpdateTransformer: Transformer[MultiSportIngest, MatchStatusUpdate] =
    Transformer
      .define[MultiSportIngest, MatchStatusUpdate]
      .withFieldComputed(_.header, _.header.transformInto[shared.Header])
      .withFieldComputed(_.namespacedFixtureId, _.multiSportMatchStateV2.betgeniusFixtureId.namespaced)
      .withFieldComputed(_.matchStatus, _.multiSportMatchStateV2.matchPhase.transformInto[shared.FixtureStatus])
      .withFieldComputed(_.score, m => extractScore(m.multiSportMatchStateV2))
      .buildTransformer

  private def extractScore(multiSportMatchStateV2: MultiSportMatchStateV2): Option[Score] =
    (multiSportMatchStateV2.homeScore, multiSportMatchStateV2.awayScore).mapN(Score.apply)
}

object Ingest {
  implicit val decoder: Decoder[Ingest] = {
    List[Decoder[Ingest]](
      Decoder[FixtureIngest].widen,
      Decoder[MarketSetIngest].widen,
      Decoder[ResultSetIngest].widen,
      Decoder[CoverageIngest].widen,
      Decoder[MultiSportIngest].widen).reduceLeft(_ or _)
  }
}
