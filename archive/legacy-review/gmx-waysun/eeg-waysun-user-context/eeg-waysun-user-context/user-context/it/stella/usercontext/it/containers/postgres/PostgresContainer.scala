package stella.usercontext.it.containers.postgres

import com.dimafeng.testcontainers.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

trait PostgresContainer {
  protected val imageName = DockerImageName.parse("postgres").withTag("12")
  protected val databaseName = "user_context"
  protected val username = "user_context"
  protected val password = "user_context"
  protected val internalPort = 5432

  lazy val pgContainer: PostgreSQLContainer = PostgreSQLContainer(imageName, databaseName, username, password)

  def pgMappedPort: Int = pgContainer.mappedPort(internalPort)
}
