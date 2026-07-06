package phoenix.bets.integration

import scala.concurrent.Future
import scala.concurrent.duration._

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.infrastructure.SlickPunterStakesRepository
import phoenix.bets.support.BetDataGenerator.generatePunterStake
import phoenix.core.TimeUtils._
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.support.DataGenerator
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class PunterStakesRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val repository = new SlickPunterStakesRepository(dbConfig)

  "PunterStakesRepository" should {
    "insert and find" in {
      val punterStake = generatePunterStake()

      await(repository.insert(punterStake))
      await(repository.find(punterStake.betId)) shouldBe Some(punterStake)
    }

    "fail to find nonexistent" in {
      await(repository.find(DataGenerator.generateBetId())) shouldBe None
    }

    "update" in {
      val punterStake = generatePunterStake(BetStatus.Voided)
      val updated = punterStake.copy(betStatus = BetStatus.Settled, outcome = Some(BetOutcome.Lost))

      await(repository.insert(punterStake))
      await(repository.update(punterStake.betId, updated.betStatus, updated.outcome))
      await(repository.find(punterStake.betId)) shouldBe Some(updated)
    }

    "search more recent than" in {
      val threshold = DataGenerator.randomOffsetDateTime()
      val punterId = generatePunterId()

      val before = generatePunterStake().copy(punterId = punterId, placedAt = threshold - 1.second)
      val at = generatePunterStake().copy(punterId = punterId, placedAt = threshold)
      val after = generatePunterStake().copy(punterId = punterId, placedAt = threshold + 1.second)
      val afterOtherPunter = generatePunterStake().copy(placedAt = after.placedAt)

      await(Future.sequence(List(before, at, after, afterOtherPunter).map(repository.insert)))
      await(repository.findMoreRecentThan(punterId, threshold)) shouldBe List(after)
    }
  }

}
