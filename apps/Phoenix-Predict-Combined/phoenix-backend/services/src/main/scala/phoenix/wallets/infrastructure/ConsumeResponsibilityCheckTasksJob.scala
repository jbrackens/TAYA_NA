package phoenix.wallets.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.traverse._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.ResponsibilityCheckTask
import phoenix.wallets.domain.ResponsibilityCheckTaskRepository

final class ConsumeResponsibilityCheckTasksJob(
    wallets: WalletsBoundedContext,
    responsibilityCheckTaskRepository: ResponsibilityCheckTaskRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ScheduledJob[Unit] {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    for {
      tasks <- responsibilityCheckTaskRepository.findScheduledForBefore(clock.currentOffsetDateTime())
      _ <- tasks.traverse(executeTask)
    } yield ()
  }

  private def executeTask(task: ResponsibilityCheckTask): Future[Unit] = {
    for {
      _ <-
        wallets
          .requestResponsibilityCheckAcceptance(task.walletId)
          .fold(
            (_: WalletNotFoundError) =>
              log.error(s"Wallet not found, aborting the task, [walletId=${task.walletId}, taskId=${task.id}]"),
            _ => ())
      _ <- responsibilityCheckTaskRepository.delete(task.id)
    } yield ()
  }
}
