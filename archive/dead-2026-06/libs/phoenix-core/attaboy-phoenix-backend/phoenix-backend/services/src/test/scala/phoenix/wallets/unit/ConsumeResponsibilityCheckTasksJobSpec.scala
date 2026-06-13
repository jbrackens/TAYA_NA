package phoenix.wallets.unit

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.boundedcontexts.wallet.MemorizedTestWalletsContext
import phoenix.core.TimeUtils._
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.infrastructure.ConsumeResponsibilityCheckTasksJob
import phoenix.wallets.support.InMemoryResponsibilityCheckTaskRepository
import phoenix.wallets.support.WalletsDataGenerator.generateResponsibilityCheckTask

final class ConsumeResponsibilityCheckTasksJobSpec extends AnyWordSpec with FutureSupport with Matchers {

  "consume and delete all jobs before the reference point" in {
    val reference = randomOffsetDateTime()

    val firstTaskBefore = generateResponsibilityCheckTask().copy(scheduledFor = reference - 1.second)
    val secondTaskBefore = generateResponsibilityCheckTask().copy(scheduledFor = reference - 1.second)
    val firstTaskAfter = generateResponsibilityCheckTask().copy(scheduledFor = reference)
    val secondTaskAfter = generateResponsibilityCheckTask().copy(scheduledFor = reference + 1.second)

    val clock = new FakeHardcodedClock(reference)
    val repository = new InMemoryResponsibilityCheckTaskRepository(
      List(firstTaskBefore, secondTaskBefore, firstTaskAfter, secondTaskAfter))
    val wallets = new MemorizedTestWalletsContext(clock)

    val job = new ConsumeResponsibilityCheckTasksJob(wallets, repository, clock)
    await(job.execute())

    repository.getAll should contain theSameElementsAs List(firstTaskAfter, secondTaskAfter)
    wallets.responsibilityCheckAcceptanceRequests should contain theSameElementsAs List(
      firstTaskBefore.walletId,
      secondTaskBefore.walletId)
  }
}
