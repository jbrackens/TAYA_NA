package phoenix.keycloakmigrator

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.traverse._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.punters.domain.AuthenticationRepository

class SubsetMigrationKcDb(authenticationRepository: AuthenticationRepository, dbConfig: DatabaseConfig[JdbcProfile])(
    implicit ec: ExecutionContext)
    extends MigrationKcDb(authenticationRepository, dbConfig) {

  def migrateFirstNMigrations(n: Int): Future[Int] = {
    migrations.take(n).traverse(_.runMigration()).map(_.sum)
  }

}
