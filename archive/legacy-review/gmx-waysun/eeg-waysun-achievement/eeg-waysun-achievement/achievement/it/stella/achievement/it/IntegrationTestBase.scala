package stella.achievement.it

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
import org.scalatestplus.play.PlaySpec
import play.api.test.Helpers.defaultAwaitTimeout

import stella.achievement.it.containers.postgres.LiquibaseSupport
import stella.achievement.it.containers.postgres.PostgresContainer
import stella.achievement.it.containers.redis.RedisContainer

abstract class IntegrationTestBase
    extends PlaySpec
    with IntegrationTestApplicationFactory
    with ForAllTestContainer
    with PostgresContainer
    with RedisContainer
    with Eventually {

  private val liquibaseChangelogPath = "liquibase/changelog.xml"
  override val container: Container = pgContainer

  implicit override val patienceConfig: PatienceConfig =
    PatienceConfig(timeout = scaled(Span(15, Seconds)), interval = scaled(Span(50, Millis)))

  protected val awaitTimeout: FiniteDuration = defaultAwaitTimeout.duration

  override protected lazy val configForDbAccess: Config = ConfigFactory
    .load()
    .withValue("slick.dbs.default.db.host", ConfigValueFactory.fromAnyRef(pgContainer.container.getContainerIpAddress))
    .withValue("slick.dbs.default.db.port", ConfigValueFactory.fromAnyRef(pgMappedPort))
    .withValue("slick.dbs.default.db.url", ConfigValueFactory.fromAnyRef(pgContainer.jdbcUrl))

  override protected lazy val initialSettings: Map[String, AnyRef] = {
    // It's awful but we need to take care of starting and stopping Redis manually.
    // The order of the initialisation of the Play app and the default test containers lifecycle don't integrate well,
    // given we need to know the dynamic details about Redis instance before initialising Play context.
    redisContainer.start()
    implicit val patienceConfig: PatienceConfig =
      PatienceConfig(timeout = scaled(Span(30, Seconds)), interval = scaled(Span(50, Millis)))
    eventually {
      Map(
        "play.cache.redis.host" -> redisContainer.container.getContainerIpAddress,
        "play.cache.redis.port" -> redisMappedPort.toString)
    }
  }

  override def afterStart(): Unit = {
    LiquibaseSupport.runMigration(pgContainer, liquibaseChangelogPath)
  }
}
