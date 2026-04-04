package stella.events

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.core.Clock
import stella.common.http.jwt.StellaAuthContext
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey

import stella.events.EventIngestorBoundedContext.EventSubmissionError
import stella.events.http.routes.json.IncomingAdminEvent
import stella.events.http.routes.json.IncomingEvent
import stella.events.persistence.PersistenceService

class EventIngestorBoundedContextImpl(persistenceService: PersistenceService)(implicit
    clock: Clock,
    messageIdProvider: MessageIdProvider)
    extends EventIngestorBoundedContext {

  override def submitEvent(event: IncomingEvent, authContext: StellaAuthContext)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit] = {
    val eventEnvelope = event.toEventEnvelope
    val key = new EventKey(authContext.primaryProjectId.toString, authContext.userId.toString)
    persistEvent(key, eventEnvelope)
  }

  override def submitEventAsAdmin(event: IncomingAdminEvent, authContext: StellaAuthContext)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit] = {
    val eventEnvelope = event.toEventEnvelope
    val userId = event.onBehalfOfUserId.getOrElse(authContext.userId)
    val projectId = event.onBehalfOfProjectId.getOrElse(authContext.primaryProjectId)
    val key = new EventKey(projectId.toString, userId.toString)
    persistEvent(key, eventEnvelope)
  }

  private def persistEvent(key: EventKey, eventEnvelope: EventEnvelope)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit] =
    persistenceService.storeEvent(key, eventEnvelope)
}
