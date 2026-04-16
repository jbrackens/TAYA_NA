package phoenix.support

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt

import akka.actor.testkit.typed.scaladsl.ActorTestKit
import akka.actor.testkit.typed.scaladsl.SerializationTestKit
import akka.actor.typed.ActorSystem
import akka.cluster.typed.Cluster
import akka.cluster.typed.Join
import akka.stream.Materializer
import com.typesafe.config.Config
import org.scalatest.BeforeAndAfterAll
import org.scalatest.TestSuite
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.support.ConfigFactory.Environment
import phoenix.testcontainers.Keycloak
import phoenix.testcontainers.Keycloak.KeycloakRealm
import phoenix.testcontainers.Postgres
import phoenix.testcontainers.SftpServer

trait ActorSystemIntegrationSpec extends IntegrationConfig with ProvidedExecutionContext with BeforeAndAfterAll {

  val testKit: ActorTestKit = ActorTestKit(config)
  val system: ActorSystem[Nothing] = testKit.system
  implicit val materializer: Materializer = Materializer(system.classicSystem)
  override implicit val ec: ExecutionContext = system.executionContext
  val serializationTestKit = new SerializationTestKit(system)
  val cluster: Cluster = Cluster(system)

  override protected def beforeAll(): Unit = {
    super.beforeAll()
    cluster.manager ! Join(cluster.selfMember.address)
  }

  override protected def afterAll(): Unit = {
    materializer.shutdown()
    ActorTestKit.shutdown(system, 20.seconds, throwIfShutdownFails = false)
    super.afterAll()
  }
}

trait IntegrationConfig extends TestSuite {
  protected def environmentOverride: Environment = Map.empty

  protected lazy val config: Config = ConfigFactory.forIntegrationTesting(environmentOverride)
}

trait SftpIntegrationSpec extends IntegrationConfig {
  private lazy val sftpProperties: Environment = Map(
    "PHOENIX_DGE_SFTP_HOST" -> SftpServer.instance.connectionProperties.host,
    "PHOENIX_DGE_SFTP_PORT" -> SftpServer.instance.connectionProperties.port.toString,
    "PHOENIX_DGE_SFTP_USER" -> SftpServer.instance.connectionProperties.user,
    "PHOENIX_DGE_SFTP_PASSWORD" -> SftpServer.instance.connectionProperties.password,
    "PHOENIX_DGE_SFTP_ROOT_DIRECTORY" -> SftpServer.instance.initNewFolder())

  override protected def environmentOverride: Environment = super.environmentOverride ++ sftpProperties
}

trait DatabaseIntegrationSpec extends IntegrationConfig with BeforeAndAfterAll {
  private lazy val postgresProperties: Environment = Map(
    "POSTGRES_HOST" -> Postgres.instance.getContainerIpAddress,
    "POSTGRES_PORT" -> Postgres.instance.getFirstMappedPort.toString,
    "POSTGRES_USER" -> Postgres.backendUser,
    "POSTGRES_PASSWORD" -> Postgres.backendUser,
    "POSTGRES_DB" -> Postgres.instance.initNewDatabase())

  override protected def environmentOverride: Environment = super.environmentOverride ++ postgresProperties

  protected lazy val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig(path = "slick", config)

  override protected def afterAll(): Unit = {
    super.afterAll()
    dbConfig.db.close()
  }
}

trait KeycloakIntegrationSpec {
  protected lazy val keycloakRealm: KeycloakRealm = Keycloak.instance.initNewRealm()
}

trait ProvidedExecutionContext {
  implicit val ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
}
