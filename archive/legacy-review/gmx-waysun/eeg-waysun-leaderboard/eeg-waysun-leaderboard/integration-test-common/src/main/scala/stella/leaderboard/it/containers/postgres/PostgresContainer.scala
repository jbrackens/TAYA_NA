package stella.leaderboard.it.containers.postgres

import com.dimafeng.testcontainers.PostgreSQLContainer

trait PostgresContainer {
  protected val imageName = "postgres:12"
  protected val databaseName = "leaderboard"
  protected val username = "leaderboard"
  protected val password = "leaderboard"
  protected val internalPort = 5432

  lazy val pgContainer: PostgreSQLContainer = PostgreSQLContainer(imageName, databaseName, username, password)

  def pgMappedPort: Int = pgContainer.mappedPort(internalPort)
}
