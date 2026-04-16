package phoenix.punters.integration

import scala.reflect.ClassTag

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterDataGenerator
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.infrastructure.SlickPunterLimitsHistoryRepository
import phoenix.punters.support.InMemoryPunterLimitsHistoryRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TruncatedTables

class PunterLimitsRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with GivenWhenThen
    with TruncatedTables {

  private case class TestSetup[R <: PunterLimitsHistoryRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  implicit val clock: Clock = Clock.utcClock

  private val liveRepositorySetup: TestSetup[SlickPunterLimitsHistoryRepository] = TestSetup(() => {
    truncateTables()
    new SlickPunterLimitsHistoryRepository(dbConfig)
  })

  private val testInMemoryRepositorySetup: TestSetup[InMemoryPunterLimitsHistoryRepository] =
    TestSetup(() => new InMemoryPunterLimitsHistoryRepository())

  List(liveRepositorySetup, testInMemoryRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {

      "insert and find limit changes" in {
        val repository = testSetup.constructRepository()
        val pagination = Pagination(currentPage = 1, itemsPerPage = 4)
        val expectedLimitChanges = PunterDataGenerator.generateLimitChanges(8)
        val punterId = expectedLimitChanges.head.punterId

        expectedLimitChanges.foreach { limitChange => await(repository.insert(limitChange)) }

        val returnedResult: PaginatedResult[LimitChange] = await(repository.findLimits(pagination, punterId))

        val expectedResult: PaginatedResult[LimitChange] =
          PaginatedResult(
            data = expectedLimitChanges.reverse.slice(0, 4),
            totalCount = expectedLimitChanges.size,
            paginationRequest = pagination)

        returnedResult shouldBe expectedResult
      }
    }
  }

}
