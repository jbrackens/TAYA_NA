package phoenix.testcontainers

import scala.io.Source

import org.flywaydb.core.Flyway
import org.testcontainers.containers.Container
import org.testcontainers.containers.PostgreSQLContainer
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.migration.api.flyway.DatabaseDatasource

import phoenix.core.Clock
import phoenix.support.ConfigFactory
import phoenix.testcontainers.Postgres._

object Postgres {
  lazy val instance: Postgres = {
    val container = new Postgres()
    container.start()
    container.setupTemplateDatabase()
    container
  }

  val backendUser = "backend"
  val flywayUser = "backend_flyway"
  val superuser = "superuser"
}

final class Postgres extends PostgreSQLContainer[Postgres]("postgres:13.4") with ContainerSupport {

  private val clock: Clock = Clock.utcClock
  private val TemplateDatabaseName = "db_template_integration_tests"

  withUsername(superuser)
  withPassword(superuser)
  withCommand("postgres -c max_connections=500")
  withReuse(true)

  def initNewDatabase(): String = {
    val databaseName = s"phoenix_${generateRandomNamespace(clock)}"
    createDatabaseFromTemplate(databaseName)
    databaseName
  }

  private def createDatabaseFromTemplate(databaseName: String): Unit = {
    ensureSuccessfulExitCode(
      execInContainer("createdb", "-U", superuser, "-T", TemplateDatabaseName, databaseName),
      description = "create database from template")

    ensureSuccessfulExitCode(
      execInContainer(
        "psql",
        "-U",
        superuser,
        "-c",
        s"""GRANT CONNECT ON DATABASE "$databaseName" TO $backendUser;""",
        databaseName),
      "grant connect privilege to backend user")
  }

  private def setupTemplateDatabase(): Unit = {
    if (doesTemplateDatabaseExist()) {
      dropTemplateDatabase()
    }

    createTemplateDatabaseWithMigrations()
  }

  private def doesTemplateDatabaseExist(): Boolean = {
    ensureSuccessfulExitCode(
      execInContainer(
        "psql",
        "-U",
        superuser,
        "--tuples-only",
        "--no-align",
        "-c",
        s"SELECT 1 FROM pg_database WHERE datname='$TemplateDatabaseName'",
        "postgres"),
      "check template database existence").trim() == "1"
  }

  private def dropTemplateDatabase(): Unit = {
    ensureSuccessfulExitCode(
      execInContainer(
        "psql",
        "-U",
        superuser,
        "-c",
        s"UPDATE pg_database SET datistemplate='false' WHERE datname='$TemplateDatabaseName'",
        "postgres"),
      "unset template flag")

    ensureSuccessfulExitCode(execInContainer("dropdb", "-U", superuser, TemplateDatabaseName), "drop template database")
  }

  private def createTemplateDatabaseWithMigrations(): Unit = {
    ensureSuccessfulExitCode(
      execInContainer("createdb", "-U", superuser, TemplateDatabaseName),
      "create template database")

    if (!doUsersExist()) {
      ensureSuccessfulExitCode(
        execInContainer("psql", "-U", superuser, "-c", getQuery("create-users.sql"), "postgres"),
        "create database users")
    }

    ensureSuccessfulExitCode(
      execInContainer(
        "psql",
        "-U",
        superuser,
        "-c",
        getQuery("create-backend-db-and-grant-privileges.sql"),
        TemplateDatabaseName),
      "create database and grant permissions to users")

    runMigrations(TemplateDatabaseName)

    ensureSuccessfulExitCode(
      execInContainer(
        "psql",
        "-U",
        superuser,
        "-c",
        s"ALTER DATABASE $TemplateDatabaseName WITH is_template TRUE;",
        TemplateDatabaseName),
      "alter template database")
  }

  private def doUsersExist(): Boolean = {
    ensureSuccessfulExitCode(
      execInContainer(
        "psql",
        "-U",
        superuser,
        "--tuples-only",
        "--no-align",
        "-c",
        s"SELECT count(*) FROM pg_roles WHERE rolname='$backendUser' OR rolname='$flywayUser'",
        "postgres"),
      "check user existence").trim == "2"
  }

  private def getQuery(filename: String) = {
    val source = Source.fromURL(getClass.getClassLoader.getResource(s"postgres/$filename"))
    try {
      source
        .getLines()
        .filterNot(x => x.startsWith("CREATE DATABASE") || x.startsWith("\\connect"))
        .map(_.replace("DATABASE backend", s"DATABASE $TemplateDatabaseName"))
        .mkString("\n")
    } finally {
      source.close()
    }
  }

  private def runMigrations(databaseName: String): Unit = {
    val configMap = Map(
      "profile" -> "slick.jdbc.PostgresProfile$",
      "db.url" -> s"jdbc:postgresql://$getContainerIpAddress:$getFirstMappedPort/$databaseName?reWriteBatchedInserts=true",
      "db.user" -> flywayUser,
      "db.password" -> flywayUser)
    val migrationSettings = ConfigFactory.fromEnvironment(configMap)
    // Let's force loading of the Postgres driver class (and hence, execution of its `static { ... }` block,
    // which registers the driver against java.sql.DriverManager) to avoid `java.sql.SQLException: No suitable driver`.
    Class.forName("org.postgresql.Driver")
    val db = DatabaseConfig.forConfig[JdbcProfile](path = "", migrationSettings).db

    try {
      // `group(true)` to group all pending migrations to a single DB transaction
      val flyway = Flyway.configure().dataSource(new DatabaseDatasource(db)).group(true).load()
      flyway.migrate()
    } finally {
      db.close()
    }
  }

  private def ensureSuccessfulExitCode(result: Container.ExecResult, description: String): String = {
    if (result.getExitCode != 0) {
      throw new RuntimeException(
        s"Executing `$description` in container failed: exit code ${result.getExitCode}, " +
        s"stdout:\n${result.getStdout}\nstderr:\n${result.getStderr}")
    } else {
      result.getStdout
    }
  }
}
