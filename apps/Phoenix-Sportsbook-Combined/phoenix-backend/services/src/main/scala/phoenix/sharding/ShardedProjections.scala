package phoenix.sharding

import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.actor.typed.Behavior
import akka.cluster.sharding.typed.ClusterShardingSettings
import akka.cluster.sharding.typed.ShardedDaemonProcessSettings
import akka.cluster.sharding.typed.scaladsl.ShardedDaemonProcess
import akka.persistence.jdbc.query.scaladsl.JdbcReadJournal
import akka.persistence.query.Offset
import akka.projection.ProjectionBehavior
import akka.projection.ProjectionContext
import akka.projection.ProjectionId
import akka.projection.eventsourced.EventEnvelope
import akka.projection.eventsourced.scaladsl.EventSourcedProvider
import akka.projection.jdbc.scaladsl.JdbcProjection
import akka.projection.scaladsl.SourceProvider
import akka.stream.scaladsl.FlowWithContext
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.CirceAkkaSerializable
import phoenix.config.PhoenixProjectionConfig
import phoenix.projections.PhoenixJdbcSession
import phoenix.projections.ProjectionEventHandler
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.sharding.ProjectionTags.Tags

object ShardedProjections {
  def initShardedDaemon[E <: CirceAkkaSerializable](
      system: ActorSystem[_],
      dbConfig: DatabaseConfig[JdbcProfile],
      projectionConfig: PhoenixProjectionConfig,
      handler: ProjectionEventHandler[E],
      tags: Tags): Unit = {
    val shardingSettings = ClusterShardingSettings(system)
    val shardedDaemonProcessSettings = ShardedDaemonProcessSettings(system).withShardingSettings(shardingSettings)

    ShardedDaemonProcess(system).init[ProjectionBehavior.Command](
      name = projectionConfig.name,
      numberOfInstances = tags.size,
      behaviorFactory = (index: Int) =>
        ProjectionHandler.createProjectionBehavior(dbConfig, projectionConfig, handler, tag = tags(index))(system),
      shardedDaemonProcessSettings,
      stopMessage = Some(ProjectionBehavior.Stop))
  }
}

object ProjectionHandler {
  private val log = LoggerFactory.getLogger(getClass)

  def createProjectionBehavior[E <: CirceAkkaSerializable](
      dbConfig: DatabaseConfig[JdbcProfile],
      projectionConfig: PhoenixProjectionConfig,
      handler: ProjectionEventHandler[E],
      tag: ProjectionTag)(implicit system: ActorSystem[_]): Behavior[ProjectionBehavior.Command] = {

    val sourceProvider: SourceProvider[Offset, EventEnvelope[E]] =
      EventSourcedProvider.eventsByTag[E](system, readJournalPluginId = JdbcReadJournal.Identifier, tag = tag.value)

    ProjectionBehavior {
      JdbcProjection.atLeastOnceFlow(
        projectionId = ProjectionId(projectionConfig.name, tag.value),
        sourceProvider = sourceProvider,
        sessionFactory = () => PhoenixJdbcSession.fromSlickDbConfig(dbConfig),
        handler = flow(handler))
    }
  }

  private def flow[E <: CirceAkkaSerializable](handler: ProjectionEventHandler[E])(implicit system: ActorSystem[_]) = {
    import system.executionContext

    // A parallelism of 1 means we get the events in order per the same shard, avoiding out of order errors
    //  for the same entity.
    FlowWithContext[EventEnvelope[E], ProjectionContext].mapAsync(parallelism = 1) { envelope =>
      handler.process(envelope).recoverWith {
        case t: Throwable =>
          log.error(s"Processing event ${envelope.event} failed", t)
          Future.failed(t)
      }
    }
  }
}

object ProjectionTags {
  type Tags = Vector[ProjectionTag]

  final case class ProjectionTag(value: String)

  object ProjectionTag {
    def from[IdType <: PhoenixId](instance: IdType, tags: Tags): ProjectionTag =
      tags(math.abs(instance.hashCode % tags.size))
  }
}
