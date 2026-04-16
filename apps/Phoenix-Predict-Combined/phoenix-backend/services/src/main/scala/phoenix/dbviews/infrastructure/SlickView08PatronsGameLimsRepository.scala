package phoenix.dbviews.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery
import slick.lifted.Tag

import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.Constants
import phoenix.dbviews.domain.model.LimitPeriod
import phoenix.dbviews.domain.model.LimitType
import phoenix.dbviews.domain.model.PatronGameLims
import phoenix.punters.PunterEntity

final class SlickView08PatronsGameLimsRepository(dbConfig: DatabaseConfig[JdbcProfile], easternClock: Clock)(implicit
    ec: ExecutionContext) {
  import dbConfig.db
  import SlickView08PatronsGameLimsRepository._
  private val patronGameLimsQuery: TableQuery[PatronGameLimsTable] = TableQuery[PatronGameLimsTable]
  def upsert(patronGameLims: PatronGameLims): Future[Unit] =
    db.run(patronGameLimsQuery.insertOrUpdate(withEasternTime(patronGameLims, easternClock))).map(_ => ())
}

object SlickView08PatronsGameLimsRepository {
  import SlickViewMappers._
  final case class PatronGameLimsWithEasternTime(
      patronGameLims: PatronGameLims,
      createdAt: OffsetDateTime,
      start: OffsetDateTime,
      finish: OffsetDateTime)
  def withEasternTime(patronGameLims: PatronGameLims, easternClock: Clock) =
    PatronGameLimsWithEasternTime(
      patronGameLims = patronGameLims,
      createdAt = easternClock.adjustToClockZone(patronGameLims.createdAt),
      start = easternClock.adjustToClockZone(patronGameLims.start),
      finish = easternClock.adjustToClockZone(patronGameLims.finish))

  final class PatronGameLimsTable(tag: Tag)
      extends Table[PatronGameLimsWithEasternTime](tag, "vNJDGE08PATRONSGAMELIMS") {
    type TableRow =
      (
          String,
          String,
          String,
          String,
          String,
          String,
          String,
          String,
          LimitType,
          Option[LimitPeriod],
          Option[BigDecimal])
    def skinName = column[String]("SKIN_NAME")
    def patronAccountId = column[String]("PATRON_ACCOUNT_ID")
    def limitTransactTimeSystem = column[String]("LIMIT_TRANSACTTIME_SYSTEM")
    def limitTransactTimeEastern = column[String]("LIMIT_TRANSACTTIME_EASTERN")
    def limitTransactStartSystem = column[String]("LIMIT_TRANSACT_STIME_SYSTEM")
    def limitTransactEndSystem = column[String]("LIMIT_TRANSACT_ETIME_SYSTEM")
    def limitTransactStartEastern = column[String]("LIMIT_TRANSACT_STIME_EASTERN")
    def limitTransactEndEastern = column[String]("LIMIT_TRANSACT_ETIME_EASTERN")
    def limitType = column[LimitType]("LIMIT_TYPE")
    def limitPeriod = column[Option[LimitPeriod]]("LIMIT_PERIOD")
    def limitAmount = column[Option[BigDecimal]]("LIMIT_AMOUNT")
    def pk = primaryKey("pk_08", (limitTransactTimeEastern, patronAccountId))
    override def * : ProvenShape[PatronGameLimsWithEasternTime] =
      (
        skinName,
        patronAccountId,
        limitTransactTimeSystem,
        limitTransactTimeEastern,
        limitTransactStartSystem,
        limitTransactEndSystem,
        limitTransactStartEastern,
        limitTransactEndEastern,
        limitType,
        limitPeriod,
        limitAmount) <> (fromTableRow, toTableRow)
    private def fromTableRow(row: TableRow): PatronGameLimsWithEasternTime =
      row match {
        case (
              _,
              patronAccountId,
              limitTransactTimeSystem,
              limitTransactTimeEastern,
              limitTransactStartSystem,
              limitTransactEndSystem,
              limitTransactStartEastern,
              limitTransactEndEastern,
              limitType,
              limitPeriod,
              limitAmount) =>
          PatronGameLimsWithEasternTime(
            patronGameLims = PatronGameLims(
              punterId = PunterEntity.PunterId(patronAccountId),
              createdAt = OffsetDateTime.parse(limitTransactTimeSystem, Constants.dateTimePattern),
              start = OffsetDateTime.parse(limitTransactStartSystem, Constants.dateTimePattern),
              finish = OffsetDateTime.parse(limitTransactEndSystem, Constants.dateTimePattern),
              limitType = limitType,
              limitPeriod = limitPeriod,
              limitAmount = limitAmount),
            createdAt = OffsetDateTime.parse(limitTransactTimeEastern, Constants.dateTimePattern),
            start = OffsetDateTime.parse(limitTransactStartEastern, Constants.dateTimePattern),
            finish = OffsetDateTime.parse(limitTransactEndEastern, Constants.dateTimePattern))
      }
    private def toTableRow(patronGameLimsWithEasternTime: PatronGameLimsWithEasternTime): Option[TableRow] = {
      val patronGameLims = patronGameLimsWithEasternTime.patronGameLims
      Some(
        (
          Constants.skinName,
          patronGameLims.punterId.value,
          patronGameLims.createdAt.format(Constants.dateTimePattern),
          patronGameLimsWithEasternTime.createdAt.format(Constants.dateTimePattern),
          patronGameLims.start.format(Constants.dateTimePattern),
          patronGameLims.finish.format(Constants.dateTimePattern),
          patronGameLimsWithEasternTime.start.format(Constants.dateTimePattern),
          patronGameLimsWithEasternTime.finish.format(Constants.dateTimePattern),
          patronGameLims.limitType,
          patronGameLims.limitPeriod,
          patronGameLims.limitAmount))
    }
  }
}
