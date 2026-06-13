package phoenix.punters.idcomply.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper
import phoenix.punters.PunterEntity
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.idcomply.domain.Events.RegistrationEvent
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.infrastructure.RegistrationDomainMappers._

final class SlickRegistrationEventRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends RegistrationEventRepository {
  import dbConfig.db

  private val registrationEvents: TableQuery[RegistrationEventsTable] = TableQuery[RegistrationEventsTable]

  override def save(event: RegistrationEvent): Future[Unit] =
    db.run(registrationEvents += RegistrationEventEntry(event.punterId, event.createdAt, event)).map(_ => ())

  override def latestEventForId(punterId: PunterEntity.PunterId): Future[Option[RegistrationEvent]] =
    db.run(registrationEvents.filter(_.punterId === punterId).sortBy(_.createdAt.desc).take(num = 1).result.headOption)
      .map(_.map(_.event))

  override def allEvents(punterId: PunterId): Future[List[RegistrationEvent]] =
    db.run(registrationEvents.filter(_.punterId === punterId).result).map(_.map(_.event).toList)
}

private final case class RegistrationEventEntry(punterId: PunterId, createdAt: OffsetDateTime, event: RegistrationEvent)

private final class RegistrationEventsTable(tag: Tag)
    extends Table[RegistrationEventEntry](tag, "registration_events") {
  type TableRow = (PunterId, OffsetDateTime, RegistrationEvent)

  def id = column[Int]("id", O.PrimaryKey, O.AutoInc)
  def punterId = column[PunterId]("punter_id")
  def createdAt = column[OffsetDateTime]("created_at")
  def event = column[RegistrationEvent]("event")

  def * =
    (id, punterId, createdAt, event) <> ({
      case (_, punterId, createdAt, event) =>
        RegistrationEventEntry(punterId, createdAt, event)
    }, (entry: RegistrationEventEntry) => Some((0, entry.punterId, entry.createdAt, entry.event)))
}
