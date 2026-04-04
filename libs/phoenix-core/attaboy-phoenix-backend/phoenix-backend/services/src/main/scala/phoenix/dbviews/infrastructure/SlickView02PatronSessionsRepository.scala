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
import phoenix.dbviews.domain.model._
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity
import phoenix.punters.PuntersBoundedContext.SessionId

final class SlickView02PatronSessionsRepository(dbConfig: DatabaseConfig[JdbcProfile], easternClock: Clock)(implicit
    ec: ExecutionContext)
    extends View02PatronSessionsRepository {
  import dbConfig.db
  import SlickView02PatronSessionsRepository._
  import SlickView02PatronSessionsRepository.PatronSessionWithEasternTime.withEasternTime

  private val patronSessionQuery: TableQuery[PatronSessionsTable] = TableQuery[PatronSessionsTable]

  override def upsert(patronSession: PatronSession): Future[Unit] =
    db.run(patronSessionQuery.insertOrUpdate(withEasternTime(patronSession, easternClock))).map(_ => ())

  override def get(sessionId: SessionId): Future[Option[PatronSession]] =
    db.run(patronSessionQuery.filter(_.sessionId === sessionId.value).result.headOption).map(_.map(_.patronSession))
}

object SlickView02PatronSessionsRepository {
  final case class PatronSessionWithEasternTime(
      patronSession: PatronSession,
      logintimeEastern: OffsetDateTime,
      logouttimeEastern: Option[OffsetDateTime])

  object PatronSessionWithEasternTime {
    def withEasternTime(patronSession: PatronSession, easternClock: Clock): PatronSessionWithEasternTime =
      PatronSessionWithEasternTime(
        patronSession = patronSession,
        logintimeEastern = easternClock.adjustToClockZone(patronSession.loginTime),
        logouttimeEastern = patronSession.logoutTime.map(easternClock.adjustToClockZone(_)))
  }
  final class PatronSessionsTable(tag: Tag)
      extends Table[PatronSessionWithEasternTime](tag, "vNJDGE02PATRONSSESSIONS") {
    type TableRow = (
        String,
        String,
        String,
        Option[String],
        String,
        Option[String],
        String,
        Option[String],
        String,
        Option[String],
        Option[String],
        Option[String])
    def skinName = column[String]("SKIN_NAME")
    def patronAccountId = column[String]("PATRON_ACCOUNT_ID")
    def sessionId = column[String]("SESSION_ID")
    def geolocationTransactionId = column[Option[String]]("GEOLOCATION_TRANSACTION_ID")
    def logintimeSystem = column[String]("LOGINTIME_SYSTEM")
    def logouttimeSystem = column[Option[String]]("LOGOUTTIME_SYSTEM")
    def logintimeEastern = column[String]("LOGINTIME_EASTERN")
    def logouttimeEastern = column[Option[String]]("LOGOUTTIME_EASTERN")
    def sessionIpv4 = column[String]("SESSION_IPV4")
    def sessionIpv6 = column[Option[String]]("SESSION_IPV6")
    def sessionLatitude = column[Option[String]]("SESSION_LATITUDE")
    def sessionLongitude = column[Option[String]]("SESSION_LONGITUDE")

    def pk = primaryKey("pk_02", sessionId)
    override def * : ProvenShape[PatronSessionWithEasternTime] =
      (
        skinName,
        patronAccountId,
        sessionId,
        geolocationTransactionId,
        logintimeSystem,
        logouttimeSystem,
        logintimeEastern,
        logouttimeEastern,
        sessionIpv4,
        sessionIpv6,
        sessionLatitude,
        sessionLongitude) <> (fromTableRow, toTableRow)
    private def fromTableRow(row: TableRow): PatronSessionWithEasternTime =
      row match {
        case (
              _,
              patronAccountId,
              sessionId,
              _,
              logintimeSystem,
              logouttimeSystem,
              logintimeEastern,
              logouttimeEastern,
              sessionIpv4,
              _,
              _,
              _) =>
          PatronSessionWithEasternTime(
            PatronSession(
              punterId = PunterEntity.PunterId(patronAccountId),
              sessionId = SessionId(sessionId),
              loginTime = OffsetDateTime.parse(logintimeSystem, Constants.dateTimePattern),
              logoutTime = logouttimeSystem.map(OffsetDateTime.parse(_, Constants.dateTimePattern)),
              ipAddress = IpAddress(sessionIpv4)),
            logintimeEastern = OffsetDateTime.parse(logintimeEastern, Constants.dateTimePattern),
            logouttimeEastern = logouttimeEastern.map(OffsetDateTime.parse(_, Constants.dateTimePattern)))
      }
    private def toTableRow(patronSessionWithEasternTime: PatronSessionWithEasternTime): Option[TableRow] = {
      val patronSession = patronSessionWithEasternTime.patronSession
      val geolocationTransactionId = None
      val sessionIpv6 = None
      val sessionLatitude = None
      val sessionLongitude = None
      Some(
        (
          Constants.skinName,
          patronSession.punterId.value,
          patronSession.sessionId.value,
          geolocationTransactionId,
          patronSession.loginTime.format(Constants.dateTimePattern),
          patronSession.logoutTime.map(time => time.format(Constants.dateTimePattern)),
          patronSessionWithEasternTime.logintimeEastern.format(Constants.dateTimePattern),
          patronSessionWithEasternTime.logouttimeEastern.map(_.format(Constants.dateTimePattern)),
          patronSession.ipAddress.value,
          sessionIpv6,
          sessionLatitude,
          sessionLongitude))
    }
  }
}
