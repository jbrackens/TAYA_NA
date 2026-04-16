package phoenix.payments.integration

import scala.reflect.ClassTag

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.CashWithdrawalReservation
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.CashWithdrawalReservationsRepository.CashWithdrawalIdentifierAlreadyExists
import phoenix.payments.infrastructure.SlickCashWithdrawalReservationsRepository
import phoenix.payments.support.InMemoryCashWithdrawalReservationsRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables
import phoenix.time.FakeHardcodedClock

class CashWithdrawalReservationRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with FutureSupport
    with TruncatedTables
    with GivenWhenThen {

  private case class TestSetup[R <: CashWithdrawalReservationsRepository: ClassTag](constructRepository: () => R) {
    def identifier: String = implicitly[ClassTag[R]].runtimeClass.getSimpleName
  }

  private val liveRepositorySetup = TestSetup(() => {
    truncateTables()
    new SlickCashWithdrawalReservationsRepository(dbConfig)
  })

  private val testRepositorySetup =
    TestSetup(() => new InMemoryCashWithdrawalReservationsRepository())

  private val clock = new FakeHardcodedClock()

  private def createReservation(): CashWithdrawalReservation =
    CashWithdrawalReservation(CashWithdrawalIdentifier.create(), clock.currentOffsetDateTime())

  List(testRepositorySetup, liveRepositorySetup).foreach { testSetup =>
    s"${testSetup.identifier}" should {
      "return 'already exists' if the reservation's identifier already exists'" in {
        val repository = testSetup.constructRepository()

        Given("withdrawal reservations")
        val firstReservation = createReservation()
        val secondReservation = createReservation()

        When("those withdrawals are inserted")
        awaitRight(repository.insert(firstReservation))
        awaitRight(repository.insert(secondReservation))

        Then("they cannot be inserted again")
        awaitLeft(repository.insert(firstReservation)) shouldBe a[CashWithdrawalIdentifierAlreadyExists.type]
        awaitLeft(repository.insert(secondReservation)) shouldBe a[CashWithdrawalIdentifierAlreadyExists.type]
      }

      "find a reservation" in {
        val repository = testSetup.constructRepository()

        Given("withdrawal reservations")
        val firstReservation = createReservation()
        val secondReservation = createReservation()

        When("those withdrawals are inserted")
        awaitRight(repository.insert(firstReservation))
        awaitRight(repository.insert(secondReservation))

        And("those withdrawals are queried by their identifier")
        val returnedReservation = await(repository.find(firstReservation.identifier))

        Then("they should be found")
        returnedReservation.get shouldBe firstReservation
      }

      "remove a reservation" in {
        val repository = testSetup.constructRepository()

        Given("withdrawal reservations")
        val firstReservation = createReservation()
        val secondReservation = createReservation()

        When("those withdrawals are inserted")
        awaitRight(repository.insert(firstReservation))
        awaitRight(repository.insert(secondReservation))

        And("those withdrawals are removed")
        await(repository.remove(firstReservation.identifier))
        await(repository.remove(secondReservation.identifier))

        Then("they can be inserted again")
        awaitRight(repository.insert(firstReservation))
        awaitRight(repository.insert(secondReservation))
      }
    }
  }
}
