package phoenix.punters.integration

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterDataGenerator
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.infrastructure.SlickPunterCoolOffsHistoryRepository
import phoenix.punters.support.InMemoryPunterCoolOffsHistoryRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class PunterCoolOffsRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {

  val repositoryGenerators = Map(
    "SlickPunterCoolOffsHistoryRepository" -> (() => new SlickPunterCoolOffsHistoryRepository(dbConfig)),
    "InMemoryPunterCoolOffsHistoryRepository" -> (() => new InMemoryPunterCoolOffsHistoryRepository()))

  repositoryGenerators.foreach {
    case (identifier, generator) =>
      identifier should {
        "insert and find limit changes" in {
          val repository = generator()
          val pagination = Pagination(currentPage = 1, itemsPerPage = 4)
          val expectedCoolOffs = PunterDataGenerator.generateCoolOffs(8)
          val punterId = expectedCoolOffs.head.punterId

          expectedCoolOffs.foreach { coolOff => await(repository.insert(coolOff)) }

          val returnedResult: PaginatedResult[PunterCoolOffEntry] = await(repository.findCoolOffs(pagination, punterId))

          val expectedResult: PaginatedResult[PunterCoolOffEntry] =
            PaginatedResult(
              data = expectedCoolOffs.reverse.slice(0, 4),
              totalCount = expectedCoolOffs.size,
              paginationRequest = pagination)

          returnedResult shouldBe expectedResult
        }
      }
  }
}
