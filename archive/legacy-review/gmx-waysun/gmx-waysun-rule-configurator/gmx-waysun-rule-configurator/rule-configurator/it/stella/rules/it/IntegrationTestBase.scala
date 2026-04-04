package stella.rules.it

import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.ForAllTestContainer
import com.dimafeng.testcontainers.MultipleContainers
import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigValueFactory
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.scalatestplus.play.PlaySpec

import stella.rules.config.RuleConfiguratorConfig
import stella.rules.it.containers.kafka.ConfluentPlatformContainers
import stella.rules.it.containers.kafka.KafkaProperties
import stella.rules.it.containers.postgres.LiquibaseSupport
import stella.rules.it.containers.postgres.PostgresContainer

abstract class IntegrationTestBase
    extends PlaySpec
    with IntegrationTestApplicationFactory
    with ForAllTestContainer
    with PostgresContainer
    with ConfluentPlatformContainers {

  private val liquibaseChangelogPath = "liquibase/changelog.xml"
  override val container: Container = MultipleContainers(pgContainer, kafkaWithSchemaRegistryContainers)

  override protected lazy val ruleConfiguratorConfig: RuleConfiguratorConfig = {
    withKafka(KafkaProperties()) { case (kafkaProperties, schemaRegistryUrl) =>
      val config = RuleConfiguratorConfig.loadConfig()
      val kafkaConfig = config.kafka
      val kafkaConfigWithTestAddresses = kafkaConfig.copy(
        bootstrapServers = kafkaProperties.properties.getProperty(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG),
        serializer = kafkaConfig.serializer.copy(schemaRegistryUrl = schemaRegistryUrl))
      config.copy(kafka = kafkaConfigWithTestAddresses)
    }
  }

  override protected lazy val configForDbAccess: Config = ConfigFactory
    .load()
    .withValue("slick.dbs.default.db.host", ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress))
    .withValue("slick.dbs.default.db.port", ConfigValueFactory.fromAnyRef(pgMappedPort))
    .withValue("slick.dbs.default.db.url", ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))

  override def afterStart(): Unit = {
    LiquibaseSupport.runMigration(pgContainer, liquibaseChangelogPath)
  }
}
