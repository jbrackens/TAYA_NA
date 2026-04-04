package gmx.users.internal

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.cluster.sharding.typed.scaladsl.Entity
import com.lightbend.lagom.scaladsl.akka.discovery.AkkaDiscoveryComponents
import com.lightbend.lagom.scaladsl.broker.kafka.LagomKafkaComponents
import com.lightbend.lagom.scaladsl.client.ConfigurationServiceLocatorComponents
import com.lightbend.lagom.scaladsl.persistence.jdbc.JdbcPersistenceComponents
import com.lightbend.lagom.scaladsl.playjson.JsonSerializerRegistry
import com.lightbend.lagom.scaladsl.server._
import com.softwaremill.macwire._
import gmx.users.api.UserService
import gmx.users.internal.aggregate.{ UserBehavior, UserState }
import gmx.users.internal.source.KafkaSource
import gmx.users.internal.source.sbtech.ProcessorSettings
import play.api.db.HikariCPComponents
import play.api.libs.ws.ahc.AhcWSComponents

import scala.concurrent.ExecutionContext

trait UserComponents extends LagomServerComponents with JdbcPersistenceComponents with HikariCPComponents with AhcWSComponents {

  implicit def executionContext: ExecutionContext

  // Bind the service that this server provides
  override lazy val lagomServer: LagomServer =
    serverFor[UserService](wire[UserServiceImpl])

  // Register the JSON serializer registry
  override lazy val jsonSerializerRegistry: JsonSerializerRegistry =
    UserSerializerRegistry

  // Start the monitoring system
  //  val startMonitoring = wire[StartMonitoring]

  // Initialize the sharding of the Aggregate. The following starts the aggregate Behavior under
  // a given sharding entity typeKey.
  clusterSharding.init(
    Entity(UserState.typeKey)(entityContext => UserBehavior.create(entityContext))
  )

  val typed: ActorSystem[Nothing] = actorSystem.toTyped

  // Initialise the consumers for SBTech events
  val kafkaSource = wire[KafkaSource]

  kafkaSource.init("sbtech-login-processor", ProcessorSettings.login(actorSystem))

  kafkaSource.init("sbtech-customer-details-processor", ProcessorSettings.customerDetails(actorSystem))
}

class UserLoader extends LagomApplicationLoader {

  override def load(context: LagomApplicationContext): LagomApplication =
    new UserApplication(context) with AkkaDiscoveryComponents

  override def loadDevMode(context: LagomApplicationContext): LagomApplication =
    new UserApplication(context) with ConfigurationServiceLocatorComponents

  override def describeService = Some(readDescriptor[UserService])
}

abstract class UserApplication(context: LagomApplicationContext)
  extends LagomApplication(context)
      with JdbcPersistenceComponents
      with HikariCPComponents
      with LagomKafkaComponents
      with AhcWSComponents
      with UserComponents {}
