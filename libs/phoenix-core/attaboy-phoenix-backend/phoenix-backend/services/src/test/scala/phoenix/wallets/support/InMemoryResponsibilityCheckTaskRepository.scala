package phoenix.wallets.support

import java.time.OffsetDateTime
import java.util.concurrent.atomic.AtomicReference

import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import phoenix.wallets.domain.ResponsibilityCheckTask
import phoenix.wallets.domain.ResponsibilityCheckTaskId
import phoenix.wallets.domain.ResponsibilityCheckTaskRepository

final class InMemoryResponsibilityCheckTaskRepository(initialTasks: List[ResponsibilityCheckTask] = List.empty)
    extends ResponsibilityCheckTaskRepository {

  private val tasks = new AtomicReference[List[ResponsibilityCheckTask]](initialTasks)

  override def insert(responsibilityCheckTask: ResponsibilityCheckTask): Future[Unit] =
    Future.successful {
      tasks.updateAndGet(_ :+ responsibilityCheckTask)
    }

  override def delete(id: ResponsibilityCheckTaskId): Future[Unit] =
    Future.successful {
      tasks.updateAndGet(_.filter(_.id != id))
    }

  override def findScheduledForBefore(reference: OffsetDateTime): Future[List[ResponsibilityCheckTask]] =
    Future.successful {
      tasks.get().filter(_.scheduledFor < reference)
    }

  def getAll: List[ResponsibilityCheckTask] = tasks.get()
}
