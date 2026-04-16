package phoenix.punters.idcomply.support

import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.idcomply.domain.Events.RegistrationEvent
import phoenix.punters.idcomply.domain.RegistrationEventRepository

final class InMemoryRegistrationEventRepository(var registrationEvents: List[RegistrationEvent] = List.empty)
    extends RegistrationEventRepository {
  override def save(event: RegistrationEvent): Future[Unit] =
    Future.successful {
      registrationEvents = registrationEvents :+ event
    }

  override def latestEventForId(punterId: PunterId): Future[Option[RegistrationEvent]] =
    Future.successful {
      registrationEvents.filter(_.punterId == punterId).sortBy(_.createdAt).reverse.headOption
    }

  override def allEvents(punterId: PunterId): Future[List[RegistrationEvent]] =
    Future.successful {
      registrationEvents.filter(_.punterId == punterId)
    }
}
