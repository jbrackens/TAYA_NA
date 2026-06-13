package phoenix.wallets.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers._
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.ResponsibilityCheckTask
import phoenix.wallets.domain.ResponsibilityCheckTaskId
import phoenix.wallets.domain.ResponsibilityCheckTaskRepository

final class SlickResponsibilityCheckTaskRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends ResponsibilityCheckTaskRepository {
  import dbConfig.db

  private val query: TableQuery[ResponsibilityCheckTasksTable] = TableQuery[ResponsibilityCheckTasksTable]

  override def insert(responsibilityCheckTask: ResponsibilityCheckTask): Future[Unit] =
    db.run(query += responsibilityCheckTask).map(_ => ())

  override def delete(id: ResponsibilityCheckTaskId): Future[Unit] =
    db.run(query.filter(_.id === id).delete).map(_ => ())

  override def findScheduledForBefore(reference: OffsetDateTime): Future[List[ResponsibilityCheckTask]] =
    db.run(query.filter(_.scheduledFor < reference).result).map(_.toList)
}

private class ResponsibilityCheckTasksTable(tag: Tag)
    extends Table[ResponsibilityCheckTask](tag, "responsibility_check_tasks") {
  def id: Rep[ResponsibilityCheckTaskId] = column[ResponsibilityCheckTaskId]("id")
  def walletId: Rep[WalletId] = column[WalletId]("wallet_id")
  def scheduledFor: Rep[OffsetDateTime] = column[OffsetDateTime]("scheduled_for")

  override def * : ProvenShape[ResponsibilityCheckTask] = (id, walletId, scheduledFor).mapTo[ResponsibilityCheckTask]
}
