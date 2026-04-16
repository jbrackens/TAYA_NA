package phoenix.projections

import akka.actor.typed.ActorSystem
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.CirceAkkaSerializable
import phoenix.config.PhoenixProjectionConfig
import phoenix.sharding.ProjectionTags.ProjectionTag
import phoenix.sharding.ShardedProjections

trait ProjectionRunner[E <: CirceAkkaSerializable] {
  def runProjection(config: PhoenixProjectionConfig, handler: ProjectionEventHandler[E]): Unit
}

object ProjectionRunner {
  def projectionRunnerFor[E <: CirceAkkaSerializable](tags: Vector[ProjectionTag])(
      system: ActorSystem[Nothing],
      dbConfig: DatabaseConfig[JdbcProfile]): ProjectionRunner[E] =
    (config: PhoenixProjectionConfig, handler: ProjectionEventHandler[E]) =>
      ShardedProjections.initShardedDaemon(system, dbConfig, config, handler, tags)
}
