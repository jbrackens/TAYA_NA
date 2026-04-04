package stella.events

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.events.EventIngestorBoundedContext.EventSubmissionError
import stella.events.http.routes.json.IncomingAdminEvent
import stella.events.http.routes.json.IncomingEvent

trait EventIngestorBoundedContext {

  def submitEvent(event: IncomingEvent, authContext: StellaAuthContext)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit]

  def submitEventAsAdmin(event: IncomingAdminEvent, authContext: StellaAuthContext)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, Unit]
}

object EventIngestorBoundedContext {

  sealed trait EventSubmissionError

  final case class UnexpectedEventSubmissionException(details: String, underlying: Throwable)
      extends EventSubmissionError

  object EventIngestorPermissions {
    object SubmitEvent extends Permission {
      override val value: String = "event_ingestor:event:write"
    }

    object SubmitEventAsSuperAdmin extends Permission {
      override val value: String = "event_ingestor:superadmin:event:write"
    }

    object SubmitEventAsAdmin extends Permission {
      override val value: String = "event_ingestor:admin:event:write"
    }
  }

}
