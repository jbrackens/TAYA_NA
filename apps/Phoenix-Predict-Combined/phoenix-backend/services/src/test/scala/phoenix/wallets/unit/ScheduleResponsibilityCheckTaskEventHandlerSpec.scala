package phoenix.wallets.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator
import phoenix.support.FutureSupport
import phoenix.wallets.application.es.ScheduleResponsibilityCheckTaskEventHandler
import phoenix.wallets.domain.ResponsibilityCheckTask
import phoenix.wallets.domain.ResponsibilityCheckTaskId
import phoenix.wallets.support.InMemoryResponsibilityCheckTaskRepository
import phoenix.wallets.support.WalletsDataGenerator

final class ScheduleResponsibilityCheckTaskEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport {
  "schedule a task one year into the future when handling a ResponsibilityCheckAccepted event" in {
    val uuidGenerator = ConstantUUIDGenerator
    val repository = new InMemoryResponsibilityCheckTaskRepository
    val event = WalletsDataGenerator.generateResponsibilityCheckAccepted()
    val eventHappenedAt = DataGenerator.randomOffsetDateTime()

    await(ScheduleResponsibilityCheckTaskEventHandler.handle(repository, uuidGenerator)(event, eventHappenedAt))

    repository.getAll shouldBe List(
      ResponsibilityCheckTask(
        ResponsibilityCheckTaskId(uuidGenerator.constantUUID),
        event.walletId,
        scheduledFor = eventHappenedAt.plusYears(1)))
  }
}
