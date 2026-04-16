package phoenix.migrations
import java.nio.charset.StandardCharsets
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import cats.data.OptionT
import io.circe.Codec
import io.circe.Decoder
import io.circe.Encoder
import io.circe.generic.semiauto.deriveCodec
import io.circe.parser._
import io.circe.syntax._
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import slick.dbio.DBIO
import slick.jdbc.GetResult
import slick.jdbc.PositionedParameters
import slick.jdbc.SetParameter

import phoenix.core.odds.Odds
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.core.serialization.PhoenixCodecs
import phoenix.markets.InitializedMarket
import phoenix.markets.LifecycleCancellationReason
import phoenix.markets.LifecycleOperationalChangeReason
import phoenix.markets.MarketCategory
import phoenix.markets.MarketInfo
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketProtocol
import phoenix.markets.MarketProtocol.Events.MarketCreated
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol.Events.MarketInfoChanged
import phoenix.markets.MarketSelections
import phoenix.markets.MarketSpecifier
import phoenix.markets.MarketState
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.SelectionOdds
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.SportEntity
import phoenix.migrations.MarketsMigrator.mapMarketCategory
import phoenix.migrations.MigrationCodecs._
import phoenix.migrations.MigratorTypes._

trait MarketsMigrator {
  def run(runBeforeDate: OffsetDateTime): Future[Unit]
}

class MarketsMigratorImpl(db: Database)(implicit system: ActorSystem[_]) extends MarketsMigrator with PhoenixCodecs {
  implicit val ec = system.executionContext
  implicit val materializer = Materializer(system)

  val logger = LoggerFactory.getLogger(getClass)
  val pageSize = 50000
  val updatesPerQuery = 3
  val parallelUpdateQuery = 3

  def run(runBeforeDate: OffsetDateTime): Future[Unit] = {
    val result = for {
      eventsMaxOrdering <- db.run(EventMigration.getEventsMaxOrdering(runBeforeDate))
      migrations = Seq(
        new SnapshotMigration(runBeforeDate, logger),
        new EventMigration(eventsMaxOrdering, logger),
        new ProjectionMigration(runBeforeDate, logger))
      _ <- Source.fromIterator(() => migrations.iterator).map(createMigrationPipeline(_)).mapAsync(1)(_.run()).run()
    } yield ()

    result.andThen {
      case Failure(exception) => logger.error("Failure migrating marketCategory", exception)
      case Success(_)         => logger.info("Migration successful")
    }
  }

  private def createMigrationPipeline[PK, Row](migrator: Migration[PK, Row]) =
    getStreamedSource(migrator.getPKs())
      .grouped(migrator.getMaxLoadedPayloads())
      .mapAsync(1)(ids => db.run(migrator.getPayload(ids)))
      .mapConcat(identity)
      .map(migrator.createUpdate)
      .grouped(updatesPerQuery)
      .mapAsync(parallelUpdateQuery) { dbActions => db.run(DBIO.sequence(dbActions)) }

  private def getStreamedSource[T](query: Pagination => DBIO[Option[Seq[T]]]): Source[T, NotUsed] = {
    Source
      .unfoldAsync(1) { page =>
        val pagination = Pagination(page, pageSize)
        OptionT(db.run(query(pagination))).map((page + 1, _)).value
      }
      .mapConcat(identity)
  }
}

sealed trait Migration[PK, Row] {
  implicit val getByteArr = GetResult(r => r.nextBytes())
  implicit val setByteArr = SetParameter((arr: Array[Byte], pp: PositionedParameters) => pp.setBytes(arr))

  def getMaxLoadedPayloads(): Int
  def getPKs(): Pagination => DBIO[Option[Seq[PK]]]
  def getPayload(ids: Seq[PK]): DBIO[Seq[Row]]
  def createUpdate(row: Row): DBIO[Unit]

  protected def migrate[T](payload: Payload, migrationFn: T => Option[T])(implicit
      decoder: Decoder[T],
      encoder: Encoder[T]): Either[io.circe.Error, Option[Payload]] = {
    for {
      oldEvent <- decode[T](new String(payload, StandardCharsets.UTF_8))
      newEvent = migrationFn(oldEvent)
      newEventSer <- Right(newEvent.map(_.asJson.noSpaces.getBytes(StandardCharsets.UTF_8)))
    } yield newEventSer
  }

  def stringifyCompositeKeysInClause(ids: Seq[(PersistenceId, SequenceNumber)]): String =
    ids
      .map {
        case (persistenceId, sequenceNumber) => s"('$persistenceId', $sequenceNumber)"
      }
      .mkString("(", ",", ")")
}

object MigratorTypes {
  type PersistenceId = String
  type SequenceNumber = Long
  type Payload = Array[Byte]
  type MId = String
  type MCategory = String
  type MType = String
  type MName = String
  type AkkaPK = (PersistenceId, SequenceNumber)
  type AkkaRow = (PersistenceId, SequenceNumber, Payload)
  type MarketRow = (MId, MName, MType, Option[MCategory])
}

object MigrationCodecs {
  // Copied from MarketsAkkaSerialization as this code will be deleted and
  // didn't want to change modifiers in the other class
  implicit lazy val fixtureIdCodec: Codec[SportEntity.FixtureId] = deriveCodec
  implicit lazy val marketTypeCodec: Codec[MarketType] = deriveCodec
  implicit lazy val marketCategoryCodec: Codec[MarketCategory] = deriveCodec
  implicit lazy val marketSpecifierCodec: Codec[MarketSpecifier] = deriveCodec
  implicit lazy val marketInfoCodec: Codec[MarketInfo] = deriveCodec
  implicit lazy val lifecycleOperationalChangeReasonCodec: Codec[LifecycleOperationalChangeReason] = deriveCodec
  implicit lazy val lifecycleCancellationReasonCodec: Codec[LifecycleCancellationReason] = deriveCodec
  implicit lazy val marketLifecycleCodec: Codec[MarketLifecycle] = deriveCodec
  implicit lazy val oddsCodec: Codec[Odds] = deriveCodec
  implicit lazy val selectionOddsCodec: Codec[SelectionOdds] = deriveCodec
  implicit lazy val marketSelectionsCodec: Codec[MarketSelections] = deriveCodec
  implicit lazy val initializedMarketCodec: Codec[InitializedMarket] = deriveCodec
  implicit lazy val marketIdCodec: Codec[MarketsBoundedContext.MarketId] = deriveCodec

  implicit lazy val marketStateCodec: Codec[MarketState] = deriveCodec
  implicit lazy val marketEventCodec: Codec[MarketProtocol.Events.MarketEvent] = deriveCodec
}

class SnapshotMigration(before: OffsetDateTime, logger: Logger)(implicit ec: ExecutionContext)
    extends Migration[AkkaPK, AkkaRow] {

  override def getMaxLoadedPayloads(): Int = 20

  override def getPKs(): Pagination => DBIO[Option[Seq[AkkaPK]]] = pagination => sql"""
      select persistence_id, sequence_number from snapshot
        where created < ${before.toInstant.toEpochMilli} and snapshot_ser_manifest = 'phoenix.markets.MarketState'
        order by created DESC
        limit ${pagination.itemsPerPage} offset ${pagination.offset}
     """.as[AkkaPK].map(items => Option.when(items.nonEmpty)(items))

  override def getPayload(ids: Seq[AkkaPK]): DBIO[Seq[AkkaRow]] =
    sql"""
         select persistence_id, sequence_number, snapshot_payload from snapshot
           where (persistence_id, sequence_number) IN #${stringifyCompositeKeysInClause(ids)}
    """.as[AkkaRow]

  override def createUpdate(row: AkkaRow): DBIO[Unit] = {
    val (persistenceId, sequenceNumber, payload) = row
    migrate[MarketState](payload, migrateSnapshotPayload) match {
      case Left(e) =>
        logger.error(
          "Error migrating snapshot with {} and {}",
          kv("persistenceId", persistenceId),
          kv("sequenceNumber", sequenceNumber))
        DBIO.failed(e)
      case Right(None) => DBIO.successful(())
      case Right(Some(newPayload)) =>
        updateSnapshot(persistenceId, sequenceNumber, newPayload).map { _ =>
          logger.info(
            "Migrated snapshot with {} and {}",
            kv("persistenceId", persistenceId),
            kv("sequenceNumber", sequenceNumber))
          ()
        }
    }
  }

  private def migrateSnapshotPayload(marketState: MarketState): Option[MarketState] =
    marketState match {
      case state: InitializedMarket =>
        Option.when(state.info.category.isEmpty) {
          val newInfo = state.info.copy(category =
            Some(mapMarketCategory(state.info.marketType, state.info.name.contains("twoway"))))
          state.copy(info = newInfo)
        }
      case _ => None
    }

  private def updateSnapshot(
      persistenceId: PersistenceId,
      sequenceNumber: SequenceNumber,
      payload: Payload): DBIO[Int] =
    sqlu"""
          update snapshot set snapshot_payload = $payload
            where persistence_id = $persistenceId and sequence_number = $sequenceNumber
      """
}

class EventMigration(maxOrdering: Long, logger: Logger)(implicit ec: ExecutionContext)
    extends Migration[AkkaPK, AkkaRow] {

  override def getMaxLoadedPayloads(): Int = 500

  override def getPKs(): Pagination => DBIO[Option[Seq[AkkaPK]]] =
    pagination => {
      val startOrdering = Math.min(maxOrdering, pagination.offset)
      val endOrdering = Math.min(maxOrdering, pagination.offset + pagination.itemsPerPage)
      sql"""
        select persistence_id, sequence_number from event_journal
          where event_ser_manifest like '%MarketEvent'
          and ordering > $startOrdering and ordering <= $endOrdering
    """.as[AkkaPK].map(Option.when(startOrdering != maxOrdering)(_))
    }

  override def getPayload(ids: Seq[AkkaPK]): DBIO[Seq[AkkaRow]] =
    sql"""
        select persistence_id, sequence_number, event_payload from event_journal
        where (persistence_id, sequence_number) IN #${stringifyCompositeKeysInClause(ids)}
    """.as[AkkaRow]

  override def createUpdate(row: AkkaRow): DBIO[Unit] = {
    val (persistenceId, sequenceNumber, payload) = row
    migrate[MarketEvent](payload, migrateEventPayload) match {
      case Left(e) =>
        logger.error(
          "Error migrating event with {} and {}",
          kv("persistenceId", persistenceId),
          kv("sequenceNumber", sequenceNumber))
        DBIO.failed(e)
      case Right(None) => DBIO.successful(())
      case Right(Some(newPayload)) =>
        updateEvent(persistenceId, sequenceNumber, newPayload).map { _ =>
          logger.info(
            "Migrated event with {} and {}",
            kv("persistenceId", persistenceId),
            kv("sequenceNumber", sequenceNumber))
          ()
        }
    }
  }

  private def migrateEventPayload(marketEvent: MarketEvent): Option[MarketEvent] =
    marketEvent match {
      case event: MarketCreated =>
        Option.when(event.info.category.isEmpty) {
          val newInfo = event.info.copy(category =
            Some(mapMarketCategory(event.info.marketType, event.info.name.contains("twoway"))))
          event.copy(info = newInfo)
        }
      case event: MarketInfoChanged =>
        Option.when(event.marketInfo.category.isEmpty) {
          val newInfo = event.marketInfo.copy(category =
            Some(mapMarketCategory(event.marketInfo.marketType, event.marketInfo.name.contains("twoway"))))
          event.copy(marketInfo = newInfo)
        }
      case _ => None
    }

  private def updateEvent(persistenceId: PersistenceId, sequenceNumber: SequenceNumber, payload: Payload): DBIO[Int] =
    sqlu"""
        update event_journal set event_payload = $payload
          where persistence_id = $persistenceId and sequence_number = $sequenceNumber
    """
}

object EventMigration {
  def getEventsMaxOrdering(before: OffsetDateTime): DBIO[Long] =
    sql"""
      select coalesce(max(ordering), 0) from event_journal
          where write_timestamp < ${before.toInstant.toEpochMilli} and event_ser_manifest like '%MarketEvent'
    """.as[Long].head
}

class ProjectionMigration(before: OffsetDateTime, logger: Logger)(implicit ec: ExecutionContext)
    extends Migration[MId, MarketRow] {

  override def getMaxLoadedPayloads(): Int = 500

  override def getPKs(): Pagination => DBIO[Option[Seq[MId]]] =
    pagination => {
      sql"""
       select market_id from markets
         where created_at < TO_TIMESTAMP(${DateTimeFormatter.ISO_DATE.format(before)},'YYYY-MM-DD')
         order by created_at DESC
         limit ${pagination.itemsPerPage} offset ${pagination.offset}
    """.as[MId].map(items => Option.when(items.nonEmpty)(items))
    }

  override def getPayload(ids: Seq[MId]): DBIO[Seq[MarketRow]] =
    sql"""
       select market_id, name, market_type, category from markets
         where market_id IN #${ids.map(id => s"'$id'").mkString("(", ",", ")")}
    """.as[MarketRow]

  override def createUpdate(row: MarketRow): DBIO[Unit] = {
    val (marketId, marketName, marketType, maybeCategory) = row
    maybeCategory.fold {
      val marketCategory = MarketType.fromString(marketType) match {
        case Left(_)   => "Unknown"
        case Right(mt) => mapMarketCategory(mt, marketName.contains("twoway")).value
      }
      updateProjection(marketId, marketCategory).map { _ =>
        logger.info("Migrating projection for {}", kv("marketId", marketId))
        ()
      }
    }(_ => DBIO.successful(()))
  }

  private def updateProjection(marketId: MId, category: MCategory): DBIO[Int] =
    sqlu"""
       update markets set category = $category where market_id = $marketId
    """

}

object MarketsMigrator {
  def mapMarketCategory(marketType: MarketType, isTwoWay: Boolean): MarketCategory =
    MarketCategory(marketType match {
      case MarketType.ActivatedRuneTypeSpawnedAt => "Activated rune type spawned at time"
      case MarketType.BeyondGodlike              => "Beyond godlike"
      case MarketType.CorrectGoals               => "Correct goal score"
      case MarketType.CorrectMatchScore          => "Correct match score"
      case MarketType.CorrectRoundScore          => "Correct round score"
      case MarketType.DragonSoulType             => "Dragon soul type"
      case MarketType.DragonType                 => "X. dragon type"
      case MarketType.FirstAegis                 => "First Aegis"
      case MarketType.FirstBaron                 => "First Baron"
      case MarketType.FirstBarracks              => "First barracks"
      case MarketType.FirstBlood                 => "First blood"
      case MarketType.FirstDragon                => "First dragon"
      case MarketType.FirstHalfWinner            => if (isTwoWay) "First half winner - twoway" else "First half winner - threeway"
      case MarketType.FirstHalfWinnerMap         => if (isTwoWay) "First half winner twoway" else "First half winner threeway"
      case MarketType.FirstInhibitor             => "First inhibitor"
      case MarketType.FirstToReachXKills         => "First to reach X kills"
      case MarketType.FirstToReachXKillsMap      => "First to reach X kills"
      case MarketType.FirstToReachXRounds        => "First to reach X rounds"
      case MarketType.FirstTower                 => "First tower"
      case MarketType.FirstTurret                => "First turret"
      case MarketType.MapDuration                => "Map duration X"
      case MarketType.MapWinner                  => "Map X winner"
      case MarketType.MatchHandicap              => "Match handicap"
      case MarketType.MatchWinner                => if (isTwoWay) "Match winner - twoway" else "Match winner - threeway"
      case MarketType.Megacreeps                 => "Megacreeps"
      case MarketType.NthKill                    => "Xth kill"
      case MarketType.NumberOfMaps               => "Number of maps X"
      case MarketType.NumberOfRounds             => "Number of rounds X"
      case MarketType.NumberOfRoundsParity       => "Number of rounds parity"
      case MarketType.Overtime                   => "Overtime"
      case MarketType.PentaKill                  => "Penta kill"
      case MarketType.PistolRoundWinner          => "Pistol Round X winner"
      case MarketType.PlaceWithinTop             => "Place within TOPX"
      case MarketType.QuadraKill                 => "Quadra kill"
      case MarketType.Rampage                    => "Rampage"
      case MarketType.RoundHandicap              => "Round handicap"
      case MarketType.RoundWinner                => "Round X winner"
      case MarketType.SecondHalfWinner =>
        if (isTwoWay) "Second half winner - twoway" else "Second half winner - threeway"
      case MarketType.SecondHalfWinnerMap =>
        if (isTwoWay) "Second half winner - twoway" else "Second half winner - threeway"
      case MarketType.TotalGoals         => "Total goals X"
      case MarketType.TotalGoalsParity   => "Total goals parity"
      case MarketType.TotalKills         => "Total kills X"
      case MarketType.TotalKillsParity   => "Total kills parity"
      case MarketType.TotalTowers        => "Total towers X"
      case MarketType.TotalTurrets       => "Total turrets"
      case MarketType.UltraKill          => "Ultra kill"
      case MarketType.Unknown            => "Unknown"
      case MarketType.WillDragonBeSlayed => "Will be X dragon slayed?"
      case MarketType.WinAtLeastOneMap   => "X wins at least one map"
    })
}
