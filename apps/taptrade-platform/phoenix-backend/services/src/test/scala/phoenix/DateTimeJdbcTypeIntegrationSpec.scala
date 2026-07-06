package phoenix

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.TimeZone

import org.scalatest.BeforeAndAfter
import org.scalatest.GivenWhenThen
import org.scalatest.Ignore
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

// This suite is meant to be ignored, it only serves as a showcase
// for why TIMESTAMP WITHOUT TIMEZONE is unsafe to use in combination with JDBC.
@Ignore
class DateTimeJdbcTypeIntegrationSpec
    extends AnyFlatSpec
    with Matchers
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with GivenWhenThen
    with FutureSupport
    with BeforeAndAfter {

  import dbConfig.db

  implicit class OffsetDateTimeOps(self: OffsetDateTime) {
    def asUtc: OffsetDateTime = self.withOffsetSameInstant(ZoneOffset.UTC)
  }

  implicit class DbioOps[T](self: DBIO[T]) {
    def retrieve(): T = await(db.run(self))
  }

  val dao = new TestTimestampPairDao

  val originalZone = TimeZone.getDefault
  val denverZone = TimeZone.getTimeZone("America/Denver") // observes daylight saving
  val londonZone = TimeZone.getTimeZone("Europe/London") // observes daylight saving
  val hongKongZone = TimeZone.getTimeZone("Asia/Hong_Kong") // does not observe daylight saving

  it should "fail at handling server time zone change for TIMESTAMP WITHOUT TIME ZONE columns" in {
    Given("time zone initially set to America/Denver")
    TimeZone.setDefault(denverZone)

    And("timestamps saved to database")
    val offsetDateTime = OffsetDateTime.of(2016, 7, 1, 12, 0, 0, 0, ZoneOffset.UTC) // summer time
    val originalTimestampPair = TestTimestampPair(offsetDateTime.toInstant, offsetDateTime)
    dao.insert(originalTimestampPair).retrieve()

    And("time zone later changed to Asia/Hong_Kong")
    TimeZone.setDefault(hongKongZone)

    When("retrieving the saved timestamps back from the database")
    val retrievedTimestampPair = dao.getAll.retrieve().head

    Then("the TIMESTAMP WITHOUT TIME ZONE column should NOT be retrieved properly")
    originalTimestampPair.ts should not be retrievedTimestampPair.ts

    And("the TIMESTAMP WITH TIME ZONE column should be retrieved properly")
    originalTimestampPair.tstz.asUtc shouldBe retrievedTimestampPair.tstz.asUtc
  }

  it should "properly handle server time zone change when TIMESTAMP WITHOUT TIME ZONE column gets migrated to TIMESTAMP WITH TIME ZONE" in {
    Given("time zone initially set to Europe/London")
    TimeZone.setDefault(londonZone)

    And("timestamps saved to database")
    val offsetDateTime = OffsetDateTime.of(2016, 1, 1, 12, 0, 0, 0, ZoneOffset.UTC) // winter time
    val originalTimestampPair = TestTimestampPair(offsetDateTime.toInstant, offsetDateTime)
    dao.insert(originalTimestampPair).retrieve()

    And("time zone later changed to Asia/Hong_Kong")
    TimeZone.setDefault(hongKongZone)

    When("changing the TIMESTAMP WITHOUT TIME ZONE column's type to TIMESTAMP WITH TIME ZONE")
    await(dbConfig.db.run(
      sqlu"ALTER TABLE test_timestamp_pair ALTER COLUMN ts TYPE TIMESTAMP WITH TIME ZONE USING ts AT TIME ZONE 'Europe/London'"))

    And("retrieving the saved timestamps back from the database")
    val retrievedTimestampPair = dao.getAll.retrieve().head

    Then("both columns should be retrieved properly")
    originalTimestampPair.ts shouldBe retrievedTimestampPair.ts
    originalTimestampPair.tstz.asUtc shouldBe retrievedTimestampPair.tstz.asUtc
  }

  before {
    sqlu"CREATE TABLE test_timestamp_pair(ts TIMESTAMP, tstz TIMESTAMP WITH TIME ZONE)".retrieve()
  }

  after {
    TimeZone.setDefault(originalZone)

    sqlu"DROP TABLE test_timestamp_pair".retrieve()
  }
}

case class TestTimestampPair(ts: Instant, tstz: OffsetDateTime)

class TestTimestampPairTable(tag: Tag) extends Table[TestTimestampPair](tag, "test_timestamp_pair") {

  def ts: Rep[Instant] = column[Instant]("ts")
  def tstz: Rep[OffsetDateTime] = column[OffsetDateTime]("tstz")

  def * : ProvenShape[TestTimestampPair] = (ts, tstz).mapTo[TestTimestampPair]

}

class TestTimestampPairDao {
  private val tableQuery = TableQuery[TestTimestampPairTable]

  def getAll: DBIO[Seq[TestTimestampPair]] = tableQuery.result

  def insert(tp: TestTimestampPair): DBIO[Int] = tableQuery += tp
}
