package phoenix.wallets.domain

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.Future

import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

trait ResponsibilityCheckTaskRepository {
  def insert(responsibilityCheckTask: ResponsibilityCheckTask): Future[Unit]

  def delete(id: ResponsibilityCheckTaskId): Future[Unit]

  def findScheduledForBefore(reference: OffsetDateTime): Future[List[ResponsibilityCheckTask]]
}

final case class ResponsibilityCheckTask(
    id: ResponsibilityCheckTaskId,
    walletId: WalletId,
    scheduledFor: OffsetDateTime)

final case class ResponsibilityCheckTaskId(value: UUID)
