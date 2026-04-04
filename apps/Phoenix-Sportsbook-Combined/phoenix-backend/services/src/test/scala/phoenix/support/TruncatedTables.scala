package phoenix.support

import slick.jdbc.SQLActionBuilder
import slick.jdbc.SetParameter.SetUnit

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.support.TruncatedTables.excludedTables

trait TruncatedTables { self: DatabaseIntegrationSpec with ProvidedExecutionContext with FutureSupport =>
  def withTruncatedTables(test: => Any): Unit = {
    truncateTables()
    test
  }

  def truncateTables(): Unit = {
    await(for {
      unfilteredTableNames <-
        dbConfig.db.run(sql"""SELECT tablename FROM pg_tables WHERE schemaname = current_schema()""".as[String])
      filteredTableNames = unfilteredTableNames.filter(tableName => !excludedTables.contains(tableName))
      truncates = filteredTableNames.map(table =>
        SQLActionBuilder(List(s"""TRUNCATE TABLE "$table" CASCADE"""), SetUnit).asUpdate)
      _ <- dbConfig.db.run(DBIO.sequence(truncates))
    } yield ())
  }
}

object TruncatedTables {
  val excludedTables = Set("flyway_schema_history")
}
