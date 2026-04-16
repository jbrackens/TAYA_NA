package phoenix.punters.unit
import akka.persistence.query.NoOffset
import akka.projection.eventsourced.EventEnvelope
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity
import phoenix.punters.PunterProtocol
import phoenix.punters.PunterState
import phoenix.punters.application.es.CoolOffsHistoryHandler
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.support.InMemoryPunterCoolOffsHistoryRepository
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class CoolOffsHistoryHandlerSpec
    extends AnyWordSpecLike
    with BeforeAndAfterAll
    with FutureSupport
    with Matchers
    with ProvidedExecutionContext {
  private val clock = Clock.utcClock

  "CoolOffsHistoryHandler" should {
    "handle CoolOffExclusionBegan event" in new EventHandlerScope {
      val punterId = PunterEntity.PunterId("123")
      val coolOffStart = clock.currentOffsetDateTime()
      val coolOffEnd = coolOffStart.plusDays(1)
      val coolOffCause = CoolOffCause.SelfInitiated
      val event = PunterProtocol.Events.CoolOffExclusionBegan(
        punterId,
        PunterState.CoolOffPeriod(coolOffStart, coolOffEnd),
        coolOffCause,
        None)
      await(eventHandler.process(EventEnvelope.create(NoOffset, "fakePersistenceId", 0, event, 0)))
      val coolOffs = await(coolOffsHistoryRepository.findCoolOffs(Pagination(1, 10), punterId))
      coolOffs.data should be(Seq(PunterCoolOffEntry(punterId, coolOffStart, coolOffEnd, coolOffCause)))
    }
  }

  private abstract class EventHandlerScope {
    val coolOffsHistoryRepository: PunterCoolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val eventHandler = new CoolOffsHistoryHandler(coolOffsHistoryRepository)
  }
}
