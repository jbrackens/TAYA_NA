package stella.events

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalamock.scalatest.AsyncMockFactory
import org.scalatest.OptionValues
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should

import stella.common.core.Clock
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey

import stella.events.gen.Generators._
import stella.events.http.routes.json.IncomingAdminEvent
import stella.events.persistence.PersistenceService
import stella.events.utils.ConstantClock
import stella.events.utils.ConstantMessageIdProvider
import stella.events.utils.SampleObjectFactory

class EventIngestorBoundedContextImplSpec
    extends AsyncFlatSpec
    with should.Matchers
    with AsyncMockFactory
    with OptionValues {

  "submitEvent" should "publish proper event with proper key" in {
    // just a sample as AsyncFlatSpec doesn't integrate well with property based tests
    val event = incomingEventGen.sample.value
    val authContext = authContextGen.sample.value
    implicit val clock: Clock = ConstantClock.now()
    implicit val messageIdProvider: MessageIdProvider = ConstantMessageIdProvider.forRandomUuid()
    val envelope = event.toEventEnvelope
    val eventKey = new EventKey(authContext.primaryProjectId.toString, authContext.userId.toString)
    val persistenceService = mock[PersistenceService]
    (persistenceService
      .storeEvent(_: EventKey, _: EventEnvelope)(_: ExecutionContext))
      .expects(eventKey, envelope, *)
      .returning(EitherT.right(Future(())))
      .once()
    val boundedContext = new EventIngestorBoundedContextImpl(persistenceService)
    boundedContext.submitEvent(event, authContext).value.map { res =>
      res shouldBe Right(())
    }
  }

  "submitEventAsAdmin" should "publish proper event with proper key when onBehalf values are set" in {
    testSubmitEventAsSuperAdmin(
      onBehalfOfProjectId = Some(SampleObjectFactory.randomProjectId()),
      onBehalfOfUserId = Some(SampleObjectFactory.randomUserId()))
  }

  it should "publish proper event with proper key when onBehalf values are not set" in {
    testSubmitEventAsSuperAdmin(onBehalfOfProjectId = None, onBehalfOfUserId = None)
  }

  private def testSubmitEventAsSuperAdmin(onBehalfOfProjectId: Option[UUID], onBehalfOfUserId: Option[String]) = {
    // just a sample as AsyncFlatSpec doesn't integrate well with property based tests
    val event = incomingAdminEventGen.sample.value
      .copy(onBehalfOfProjectId = onBehalfOfProjectId, onBehalfOfUserId = onBehalfOfUserId)
    testSubmitEventAsAdmin(onBehalfOfProjectId, onBehalfOfUserId, event)
  }

  private def testSubmitEventAsAdmin(
      onBehalfOfProjectId: Option[UUID],
      onBehalfOfUserId: Option[String],
      event: IncomingAdminEvent) = {
    val authContext =
      authContextGen.sample.getOrElse(throw new Exception("Could not generate a test additional auth context"))
    implicit val clock: Clock = ConstantClock.now()
    implicit val messageIdProvider: MessageIdProvider = ConstantMessageIdProvider.forRandomUuid()
    val envelope = event.toEventEnvelope
    val projectId = onBehalfOfProjectId.getOrElse(authContext.primaryProjectId).toString
    val userId = onBehalfOfUserId.getOrElse(authContext.userId)
    val eventKey = new EventKey(projectId, userId.toString)
    val persistenceService = mock[PersistenceService]
    (persistenceService
      .storeEvent(_: EventKey, _: EventEnvelope)(_: ExecutionContext))
      .expects(eventKey, envelope, *)
      .returning(EitherT.right(Future(())))
      .once()
    val boundedContext = new EventIngestorBoundedContextImpl(persistenceService)
    boundedContext.submitEventAsAdmin(event, authContext).value.map { res =>
      res shouldBe Right(())
    }
  }
}
