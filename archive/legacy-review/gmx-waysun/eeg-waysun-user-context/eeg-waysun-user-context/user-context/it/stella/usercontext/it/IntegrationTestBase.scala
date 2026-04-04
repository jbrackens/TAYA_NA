package stella.usercontext.it

import scala.concurrent.duration.FiniteDuration

import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.ForAllTestContainer
import com.typesafe.config.ConfigValueFactory
import org.scalatest.concurrent.Eventually
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatestplus.play.BaseOneAppPerSuite
import org.scalatestplus.play.PlaySpec
import play.api.test.Helpers.defaultAwaitTimeout

import stella.usercontext.it.containers.postgres.LiquibaseSupport
import stella.usercontext.it.containers.postgres.PostgresContainer

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

  override protected lazy val initialSettings: Map[String, AnyRef] = {
    // W need to know the dynamic details about Postgres instance before initialising Play context.
    implicit val patienceConfig: PatienceConfig =
      PatienceConfig(timeout = scaled(Span(30, Seconds)), interval = scaled(Span(50, Millis)))
    eventually {
      Map(
        "akka-persistence-jdbc.shared-databases.slick.db.host" -> ConfigValueFactory.fromAnyRef(
          pgContainer.container.getContainerIpAddress),
        "akka-persistence-jdbc.shared-databases.slick.db.port" -> ConfigValueFactory.fromAnyRef(pgMappedPort),
        "akka-persistence-jdbc.shared-databases.slick.db.url" -> ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))
    }
  }

  override def afterStart(): Unit = {
    LiquibaseSupport.runMigration(pgContainer, liquibaseChangelogPath)
  }
}
