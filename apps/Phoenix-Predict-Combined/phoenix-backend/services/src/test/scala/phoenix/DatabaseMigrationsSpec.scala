package phoenix

import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.testcontainers.Postgres

// This spec is used for the purpose of checking correctness of DB migrations from CI pipeline.
// IntegrationSpecs also happen to run the DB migrations currently, but this might change in the future.
class DatabaseMigrationsSpec extends AnyWordSpecLike {
  "Database migrations" should {
    "pass successfully" in {
      try {
        Postgres.instance.initNewDatabase()
      } catch {
        // We apparently can't pass `e` as the second argument to `fail` due to https://github.com/lightbend/config/issues/288
        case e: Throwable =>
          fail(s"Database migrations are incorrect:\n$e")
      }
    }
  }
}
