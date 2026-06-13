package stella.wallet.it

import scala.concurrent.duration.FiniteDuration

import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.ForAllTestContainer
import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import com.typesafe.config.ConfigValueFactory
import org.scalatest.concurrent.Eventually
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatestplus.play.BaseOneAppPerSuite
import org.scalatestplus.play.PlaySpec
import play.api.test.Helpers.defaultAwaitTimeout

import stella.wallet.it.containers.postgres.LiquibaseSupport
import stella.wallet.it.containers.postgres.PostgresContainer

abstract class IntegrationTestBase
    extends PlaySpec
    with IntegrationTestApplicationFactory
    with BaseOneAppPerSuite
    with ForAllTestContainer
    with PostgresContainer
    with Eventually {

  private val liquibaseChangelogPath = "liquibase/changelog.xml"
  override val container: Container = pgContainer

  implicit override val patienceConfig: PatienceConfig =
    PatienceConfig(timeout = scaled(Span(15, Seconds)), interval = scaled(Span(50, Millis)))

  protected val awaitTimeout: FiniteDuration = defaultAwaitTimeout.duration

  override protected lazy val configForDbAccess: Config = ConfigFactory
    .load()
    .withValue("slick.db.host", ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress))
    .withValue("slick.db.port", ConfigValueFactory.fromAnyRef(pgMappedPort))
    .withValue("slick.db.url", ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))

  override protected lazy val transactionReadDbConfig: Config = ConfigFactory
    .load()
    .withValue(
      "transaction-read.slick.db.host",
      ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress))
    .withValue("transaction-read.slick.db.port", ConfigValueFactory.fromAnyRef(pgMappedPort))
    .withValue("transaction-read.slick.db.url", ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))

  override protected lazy val initialSettings: Map[String, AnyRef] = {
    // W need to know the dynamic details about Postgres instance before initialising Play context.
    implicit val patienceConfig: PatienceConfig =
      PatienceConfig(timeout = scaled(Span(30, Seconds)), interval = scaled(Span(50, Millis)))
    eventually {
      Map(
        "slick.db.host" -> ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress),
        "slick.db.port" -> ConfigValueFactory.fromAnyRef(pgMappedPort),
        "slick.db.url" -> ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl),
        "transaction-read.slick.db.host" -> ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress),
        "transaction-read.slick.db.port" -> ConfigValueFactory.fromAnyRef(pgMappedPort),
        "transaction-read.slick.db.url" -> ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))
    }
  }

  override def afterStart(): Unit = {
    LiquibaseSupport.runMigration(pgContainer, liquibaseChangelogPath)
  }
}
