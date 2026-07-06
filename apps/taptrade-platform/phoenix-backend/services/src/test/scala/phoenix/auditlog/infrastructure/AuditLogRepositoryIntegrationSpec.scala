package phoenix.auditlog.infrastructure

import scala.reflect.ClassTag

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.auditlog.domain.AccountClosureEntry
import phoenix.auditlog.domain.AccountCreationEntry
import phoenix.auditlog.domain.AuditLogRepository
import phoenix.auditlog.domain.PredictionMarketLifecycleEntry
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterDataGenerator.Api
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables
import phoenix.time.FakeHardcodedClock

final class AuditLogRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with GivenWhenThen
    with TruncatedTables {

  private case class TestSetup[R <: AuditLogRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  private val liveRepositorySetup = TestSetup(() => {
    truncateTables()
    new SlickAuditLogRepository(dbConfig)
  })

  private val testRepositorySetup =
    TestSetup(() => new InMemoryAuditLogRepository())

  private val clock = new FakeHardcodedClock()

  List(testRepositorySetup, liveRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {

      "store and return audit log entries" in {
        val repository = testSetup.constructRepository()

        val now = clock.currentOffsetDateTime()
        val expectedLogEntries = List(
          AccountCreationEntry(Api.generatePunterId(), now),
          AccountClosureEntry(Api.generatePunterId(), now.plusSeconds(1)),
          AccountCreationEntry(Api.generatePunterId(), now.plusSeconds(2)),
          AccountClosureEntry(Api.generatePunterId(), now.plusSeconds(3)),
          AccountCreationEntry(Api.generatePunterId(), now.plusSeconds(4)),
          AccountClosureEntry(Api.generatePunterId(), now.plusSeconds(5)),
          PredictionMarketLifecycleEntry(
            action = "prediction.market.suspended",
            actorId = "trader-001",
            targetId = "pm-btc-120k-2026",
            product = "prediction",
            details = "operator review",
            occurredAt = now.plusSeconds(6),
            dataBefore = Map("status" -> "live"),
            dataAfter = Map("status" -> "suspended"),
            createdAt = now.plusSeconds(6)),
          AccountCreationEntry(Api.generatePunterId(), now.plusSeconds(7)),
          AccountClosureEntry(Api.generatePunterId(), now.plusSeconds(8)))

        expectedLogEntries.foreach { logEntry => await(repository.insert(logEntry)) }

        val pagination = Pagination(1, 4)
        val returnedResult = await(repository.listAll(pagination))

        val expectedResult = PaginatedResult(expectedLogEntries.reverse.slice(0, 4), 9, pagination)

        returnedResult shouldBe expectedResult
      }
    }
  }
}
