package stella.leaderboard.ingestor.it

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.FiniteDuration

import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.ForAllTestContainer
import com.dimafeng.testcontainers.MultipleContainers
import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigValueFactory
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpec
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.AdjustableClock
import stella.common.core.Clock

import stella.leaderboard.ingestor.AggregationResultIngestorModule
import stella.leaderboard.ingestor.config.LeaderboardKafkaConfig
import stella.leaderboard.ingestor.it.containers.kafka.ConfluentPlatformContainers
import stella.leaderboard.ingestor.it.containers.kafka.KafkaProperties
import stella.leaderboard.it.containers.postgres.LiquibaseSupport
import stella.leaderboard.it.containers.postgres.PostgresContainer

abstract class IntegrationTestBase
    extends AnyWordSpec
    with should.Matchers
    with ForAllTestContainer
    with PostgresContainer
    with ConfluentPlatformContainers
    with Eventually {

  private val liquibaseChangelogPath = "liquibase/changelog.xml"
  override val container: Container = MultipleContainers(pgContainer, kafkaWithSchemaRegistryContainers)

  implicit override val patienceConfig: PatienceConfig =
    PatienceConfig(timeout = scaled(Span(15, Seconds)), interval = scaled(Span(50, Millis)))

  protected val awaitTimeout: FiniteDuration = patienceConfig.timeout

  protected implicit lazy val testClock: AdjustableClock = new AdjustableClock

  protected lazy val ingestorModule: AggregationResultIngestorModule = new AggregationResultIngestorModule {
    // scalastyle:off
    import scala.concurrent.ExecutionContext.Implicits.global
    // scalastyle:on

    implicit def executionContext: ExecutionContext = global

    override implicit lazy val clock: Clock = testClock

    override lazy val config: LeaderboardKafkaConfig = withKafka(KafkaProperties()) {
      case (kafkaProperties, schemaRegistryUrl) =>
        val config = LeaderboardKafkaConfig.loadConfig()
        config.copy(
          bootstrapServers = kafkaProperties.properties.getProperty(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG),
          serializer = config.serializer.copy(schemaRegistryUrl = schemaRegistryUrl))
    }

    override lazy val dbConfig: DatabaseConfig[JdbcProfile] =
      DatabaseConfig.forConfig("slick.dbs.default", configForDbAccess)
  }

  protected lazy val configForDbAccess: Config = ConfigFactory
    .load()
    .withValue("slick.dbs.default.db.host", ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress))
    .withValue("slick.dbs.default.db.port", ConfigValueFactory.fromAnyRef(pgMappedPort))
    .withValue("slick.dbs.default.db.url", ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))

  override def afterStart(): Unit = {
    LiquibaseSupport.runMigration(pgContainer, liquibaseChangelogPath)
  }
}
