package stella.wallet.it.containers.postgres

import com.dimafeng.testcontainers.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

trait PostgresContainer {
  protected val imageName = DockerImageName.parse("postgres").withTag("12")
  protected val databaseName = "wallet"
  protected val username = "wallet"
  protected val password = "wallet"
  protected val internalPort = 5432

  lazy val pgContainer: PostgreSQLContainer = PostgreSQLContainer(imageName, databaseName, username, password)

  def pgMappedPort: Int = pgContainer.mappedPort(internalPort)
}
