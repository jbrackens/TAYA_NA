package stella.wallet.services.projections

import scala.concurrent.Future
import scala.util.control.NonFatal

import akka.Done
import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.cluster.sharding.typed.ClusterShardingSettings
import akka.cluster.sharding.typed.ShardedDaemonProcessSettings
import akka.cluster.sharding.typed.scaladsl.ShardedDaemonProcess
import akka.persistence.jdbc.query.scaladsl.JdbcReadJournal
import akka.projection.ProjectionBehavior
import akka.projection.ProjectionContext
import akka.projection.ProjectionId
import akka.projection.eventsourced.EventEnvelope
import akka.projection.eventsourced.scaladsl.EventSourcedProvider
import akka.projection.jdbc.scaladsl.JdbcProjection
import akka.stream.scaladsl.FlowWithContext
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.wallet.config.WalletTransactionProjectionConfig
import stella.wallet.db.transaction.TransactionWriteRepository
import stella.wallet.services.WalletActorProtocol.WalletEvent

class WalletTransactionProjectionHandler(
    system: ActorSystem[_],
    dbConfig: DatabaseConfig[JdbcProfile],
    transactionRepository: TransactionWriteRepository,
    walletTransactionProjectionConfig: WalletTransactionProjectionConfig,
    tags: WalletTags) {
  import WalletTransactionProjectionHandler._
  import system.executionContext

  def startShardedDaemonProcess(): Unit = {
    val shardingSettings = ClusterShardingSettings(system)
    val shardedDaemonProcessSettings = ShardedDaemonProcessSettings(system).withShardingSettings(shardingSettings)

    ShardedDaemonProcess(system).init[ProjectionBehavior.Command](
      name = walletTransactionProjectionConfig.projectionName,
      numberOfInstances = tags.walletTags.size,
      behaviorFactory = (index: Int) => createProjectionBehavior(tag = tags.walletTags(index).value),
      shardedDaemonProcessSettings,
      stopMessage = Some(ProjectionBehavior.Stop))
  }

  private def createProjectionBehavior(tag: String): Behavior[ProjectionBehavior.Command] = {
    val sourceProvider =
      EventSourcedProvider.eventsByTag[WalletEvent](system, readJournalPluginId = JdbcReadJournal.Identifier, tag = tag)

    ProjectionBehavior(
      JdbcProjection.atLeastOnceFlow(
        projectionId = ProjectionId(walletTransactionProjectionConfig.projectionName, tag),
        sourceProvider = sourceProvider,
        sessionFactory = () => StellaJdbcSession.fromSlickDbConfig(dbConfig),
        handler = flow)(system))
  }

  private def flow = {
    FlowWithContext[EventEnvelope[WalletEvent], ProjectionContext]
      .mapAsync(walletTransactionProjectionConfig.parallelismLevel) { envelope =>
        handleEvent(transactionRepository, envelope.event).recoverWith { case NonFatal(e) =>
          log.error(s"Processing event ${envelope.event} failed", e)
          Future.failed(e)
        }
      }
  }

  private def handleEvent(transactionRepository: TransactionWriteRepository, event: WalletEvent): Future[Done] =
    (event match {
      case e: WalletEvent.FundsAdded      => transactionRepository.persist(e.toTransaction)
      case e: WalletEvent.FundsSubtracted => transactionRepository.persist(e.toTransaction)
    }).map(_ => Done)
}

object WalletTransactionProjectionHandler {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
