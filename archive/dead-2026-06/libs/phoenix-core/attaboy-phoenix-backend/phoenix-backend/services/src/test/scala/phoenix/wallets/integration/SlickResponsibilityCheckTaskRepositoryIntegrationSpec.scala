package phoenix.wallets.integration

import scala.concurrent.duration._

import cats.syntax.traverse._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables
import phoenix.wallets.infrastructure.SlickResponsibilityCheckTaskRepository
import phoenix.wallets.support.WalletsDataGenerator.generateResponsibilityCheckTask
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

final class SlickResponsibilityCheckTaskRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with TruncatedTables {

  private val repository = new SlickResponsibilityCheckTaskRepository(dbConfig)

  "insert and retrieve tasks" in withTruncatedTables {
    val reference = randomOffsetDateTime()
    val walletId = generateWalletId()

    val taskBefore = generateResponsibilityCheckTask().copy(walletId = walletId, scheduledFor = reference - 1.second)
    val taskAt = generateResponsibilityCheckTask().copy(walletId = walletId, scheduledFor = reference)
    val taskAfter = generateResponsibilityCheckTask().copy(walletId = walletId, scheduledFor = reference + 1.second)
    val taskBeforeOtherWallet = generateResponsibilityCheckTask().copy(scheduledFor = reference - 1.second)

    await(List(taskBefore, taskAt, taskAfter, taskBeforeOtherWallet).traverse(repository.insert))

    await(repository.findScheduledForBefore(reference)) should contain theSameElementsAs List(
      taskBefore,
      taskBeforeOtherWallet)
  }

  "delete tasks" in withTruncatedTables {
    val reference = randomOffsetDateTime()
    val scheduledFor = reference - 1.second

    val firstTaskBefore = generateResponsibilityCheckTask().copy(scheduledFor = scheduledFor)
    val secondTaskBefore = generateResponsibilityCheckTask().copy(scheduledFor = scheduledFor)

    val found = await(for {
      _ <- repository.insert(firstTaskBefore)
      _ <- repository.insert(secondTaskBefore)
      _ <- repository.delete(firstTaskBefore.id)
      result <- repository.findScheduledForBefore(reference)
    } yield result)

    found shouldBe List(secondTaskBefore)
  }
}
