package phoenix.punters.exclusion.integration

import scala.concurrent.duration._
import scala.util.Random

import cats.syntax.foldable._
import cats.syntax.traverse._
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.TimeUtils._
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository
import phoenix.punters.exclusion.infrastructure.SlickSelfExcludedPuntersRepository
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateSelfExcludedPunter
import phoenix.punters.exclusion.support.InMemorySelfExcludedPuntersRepository
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class SelfExcludedPuntersRepositoryIntegrationSpecWithVerification
    extends AnyWordSpec
    with Matchers
    with BeforeAndAfterAll
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with TruncatedTables {

  private val inMemoryRepository = () => new InMemorySelfExcludedPuntersRepository()
  private val jdbcRepository = () => {
    truncateTables()
    new SlickSelfExcludedPuntersRepository(dbConfig)
  }

  "InMemorySelfExcludedPuntersRepository" should behave.like(selfExcludedPuntersRepositoryTests(inMemoryRepository))
  "SlickSelfExcludedPuntersRepository" should behave.like(selfExcludedPuntersRepositoryTests(jdbcRepository))

  private def selfExcludedPuntersRepositoryTests(emptyRepository: () => SelfExcludedPuntersRepository): Unit = {
    "insert and retrieve existing and non-existent self excluded punters" in {
      val repository = emptyRepository()
      val selfExcludedPunter = generateSelfExcludedPunter()

      await(repository.search(generatePunterId())) shouldBe None

      await(repository.upsert(selfExcludedPunter))

      await(repository.search(selfExcludedPunter.punterId)) shouldBe Some(selfExcludedPunter)
      await(repository.search(generatePunterId())) shouldBe None
    }

    "modify existing self excluded punter" in {
      val repository = emptyRepository()
      val selfExcludedPunterBeforeUpdate = generateSelfExcludedPunter()
      val selfExcludedPunterAfterUpdate =
        generateSelfExcludedPunter().copy(punterId = selfExcludedPunterBeforeUpdate.punterId)

      await(repository.upsert(selfExcludedPunterBeforeUpdate))
      await(repository.upsert(selfExcludedPunterAfterUpdate))

      await(repository.search(selfExcludedPunterBeforeUpdate.punterId)) shouldBe Some(selfExcludedPunterAfterUpdate)
    }

    "delete existing self excluded punters" in {
      val repository = emptyRepository()
      val selfExcludedPunterToDelete = generateSelfExcludedPunter()
      val others = List.fill(5)(generateSelfExcludedPunter())

      await(Random.shuffle(others :+ selfExcludedPunterToDelete).traverse_(repository.upsert))

      await(repository.delete(selfExcludedPunterToDelete.punterId))

      await(repository.search(selfExcludedPunterToDelete.punterId)) shouldBe None
      await(repository.search(others.head.punterId)) shouldBe a[Some[_]]
    }

    "retrieve self excluded punters according to when they were excluded, sorted in ascending order" in {
      val repository = emptyRepository()

      val lowerBoundInclusive = randomOffsetDateTime()

      val puntersOutsideQueryRange = List(
        generateSelfExcludedPunter().copy(excludedAt = lowerBoundInclusive - 1.second),
        generateSelfExcludedPunter().copy(excludedAt = lowerBoundInclusive - 1.day),
        generateSelfExcludedPunter().copy(excludedAt = lowerBoundInclusive - 7.days))

      val puntersInsideQueryRange = List(
        generateSelfExcludedPunter().copy(excludedAt = lowerBoundInclusive),
        generateSelfExcludedPunter().copy(excludedAt = lowerBoundInclusive + 1.second),
        generateSelfExcludedPunter().copy(excludedAt = lowerBoundInclusive + 7.days))

      await(Random.shuffle(puntersOutsideQueryRange ++ puntersInsideQueryRange).traverse(repository.upsert))

      (await(repository.searchExcludedAfter(lowerBoundInclusive)) should contain)
        .theSameElementsInOrderAs(puntersInsideQueryRange)
    }
  }
}
