package stella.rules.it.containers.postgres

import com.dimafeng.testcontainers.PostgreSQLContainer
import liquibase.Contexts
import liquibase.Liquibase
import liquibase.database.jvm.JdbcConnection
import liquibase.resource.ClassLoaderResourceAccessor
import org.postgresql.ds.PGSimpleDataSource

trait LiquibaseSupport {

  def runMigration(pgContainer: PostgreSQLContainer, changelogPath: String): Unit = {
    val dataSource = new PGSimpleDataSource
    dataSource.setUrl(pgContainer.jdbcUrl)
    dataSource.setUser(pgContainer.username)
    dataSource.setPassword(pgContainer.password)
    val dbConnection = new JdbcConnection(dataSource.getConnection)
    val resourceAccessor = new ClassLoaderResourceAccessor()
    val liquibase = new Liquibase(changelogPath, resourceAccessor, dbConnection)
    liquibase.update(new Contexts())
  }
}

object LiquibaseSupport extends LiquibaseSupport
