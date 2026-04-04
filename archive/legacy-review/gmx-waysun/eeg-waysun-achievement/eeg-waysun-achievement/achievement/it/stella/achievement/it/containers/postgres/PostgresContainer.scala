package stella.achievement.it.containers.postgres

import com.dimafeng.testcontainers.PostgreSQLContainer

trait PostgresContainer {
  protected val imageName = "postgres:12"
  protected val databaseName = "achievement"
  protected val username = "achievement"
  protected val password = "achievement"
  protected val internalPort = 5432

  lazy val pgContainer: PostgreSQLContainer = PostgreSQLContainer(imageName, databaseName, username, password)

  def pgMappedPort: Int = pgContainer.mappedPort(internalPort)
}
