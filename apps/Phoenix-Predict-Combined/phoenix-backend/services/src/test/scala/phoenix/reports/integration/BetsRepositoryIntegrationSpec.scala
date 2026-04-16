package phoenix.reports.integration

import scala.concurrent.duration._
import scala.reflect.ClassTag
import scala.util.Random

import akka.NotUsed
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import cats.syntax.foldable._
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetsRepository
import phoenix.reports.infrastructure.InMemoryBetsRepository
import phoenix.reports.infrastructure.ReportsDataGenerator.generateBet
import phoenix.reports.infrastructure.SlickBetsRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TimeDataGenerator
import phoenix.support.TruncatedTables

final class BetsRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with GivenWhenThen
    with TruncatedTables {

  private case class TestSetup[R <: BetsRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  private val liveRepositorySetup = TestSetup(() => {
    truncateTables()
    new SlickBetsRepository(dbConfig)
  })
  private val testRepositorySetup =
    TestSetup(() => new InMemoryBetsRepository())

  List(testRepositorySetup, liveRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {
      "upsert and retrieve bets" in {
        val repository = testSetup.constructRepository()
        val bet = generateBet()
        val updated = generateBet().copy(betId = bet.betId)

        await(repository.find(bet.betId)) shouldBe None
        await(repository.upsert(bet))
        await(repository.find(bet.betId)) shouldBe Some(bet)
        await(repository.upsert(updated))
        await(repository.find(bet.betId)) shouldBe Some(updated)
      }

      "update closed at" in {
        val repository = testSetup.constructRepository()

        val bet = generateBet()
        val closedAt = randomOffsetDateTime()

        await(repository.upsert(bet))
        await(repository.setClosedAt(bet.betId, closedAt))
        await(repository.find(bet.betId)) shouldBe Some(bet.copy(closedAt = Some(closedAt)))
      }

      "find bets that were opened at reference point" in {
        val repository = testSetup.constructRepository()

        Given("a point of time reference")
        val closedAtReference = randomOffsetDateTime()

        Given("bets that will be opened and closed before, exactly at, and after the reference")
        val placedBeforeNotClosed =
          generateBet().copy(placedAt = TimeDataGenerator.before(closedAtReference), closedAt = None)
        val placedBeforeClosedBefore = {
          val closedAt = TimeDataGenerator.before(closedAtReference)
          generateBet().copy(placedAt = TimeDataGenerator.before(closedAt), closedAt = Some(closedAt))
        }
        val placedBeforeClosedAt =
          generateBet().copy(placedAt = TimeDataGenerator.before(closedAtReference), closedAt = Some(closedAtReference))
        val placedBeforeClosedAfter =
          generateBet().copy(
            placedAt = TimeDataGenerator.before(closedAtReference),
            closedAt = Some(TimeDataGenerator.after(closedAtReference)))
        val placedAtClosedAfter =
          generateBet().copy(placedAt = closedAtReference, closedAt = Some(TimeDataGenerator.after(closedAtReference)))
        val placedAtNotClosed = generateBet().copy(placedAt = closedAtReference, closedAt = None)
        val placedAfterClosedAfter = {
          val placedAt = TimeDataGenerator.after(closedAtReference)
          generateBet().copy(placedAt = placedAt, closedAt = Some(TimeDataGenerator.after(placedAt)))
        }
        val placedAfterNotClosed =
          generateBet().copy(placedAt = TimeDataGenerator.after(closedAtReference), closedAt = None)

        val allBets = List(
          placedBeforeNotClosed,
          placedBeforeClosedBefore,
          placedBeforeClosedAt,
          placedBeforeClosedAfter,
          placedAtClosedAfter,
          placedAtNotClosed,
          placedAfterClosedAfter,
          placedAfterNotClosed)

        Then("querying without any data should always return an empty result")
        consume(repository.findOpenBetsAsOf(closedAtReference)) shouldBe List.empty

        Given("all the open bets are inserted")
        await(allBets.traverse_(repository.upsert))

        Then("find bets opened BEFORE OR AT reference AND (closed AFTER reference OR NOT closed)")
        consume(repository.findOpenBetsAsOf(closedAtReference)) should contain theSameElementsAs List(
          placedBeforeNotClosed,
          placedBeforeClosedAfter,
          placedAtClosedAfter,
          placedAtNotClosed)
      }

      "found bets should be ordered by created at field" in {
        val repository = testSetup.constructRepository()

        Given("a reference point in time")
        val closedAtReference = randomOffsetDateTime()

        Given("three opened bets in order of oldest to recent, inserted in random order")
        val oldestBet = generateBet().copy(placedAt = closedAtReference - 7.days, closedAt = None)
        val middleBet = generateBet().copy(placedAt = closedAtReference - 4.days, closedAt = None)
        val newestBet = generateBet().copy(placedAt = closedAtReference - 1.days, closedAt = None)
        await(Random.shuffle(List(oldestBet, middleBet, newestBet)).traverse_(repository.upsert))

        Then("when we retrieve them they should be ordered")
        consume(repository.findOpenBetsAsOf(closedAtReference)) should contain.theSameElementsInOrderAs(
          List(oldestBet, middleBet, newestBet))
      }
    }
  }

  private def consume(source: Source[Bet, NotUsed]): List[Bet] =
    await(source.toMat(Sink.seq)(Keep.right).run()).toList
}
