package stella.rules.it.containers.postgres

import com.dimafeng.testcontainers.PostgreSQLContainer

trait PostgresContainer {
  protected val imageName = "postgres:12"
  protected val databaseName = "rule_configurator"
  protected val username = "rule_configurator"
  protected val password = "rule_configurator"
  protected val internalPort = 5432

  lazy val pgContainer: PostgreSQLContainer = PostgreSQLContainer(imageName, databaseName, username, password)

  def pgMappedPort: Int = pgContainer.mappedPort(internalPort)
}
