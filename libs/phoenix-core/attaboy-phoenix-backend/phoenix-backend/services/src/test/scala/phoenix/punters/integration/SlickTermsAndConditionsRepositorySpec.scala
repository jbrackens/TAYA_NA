package phoenix.punters.integration

import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.Terms
import phoenix.punters.domain.TermsAndConditionsRepository.TermsAndConditionsErrors.WrongTermsValue
import phoenix.punters.domain.TermsContent
import phoenix.punters.domain.TermsDaysThreshold
import phoenix.punters.infrastructure.SlickTermsAndConditionsRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class SlickTermsAndConditionsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with TruncatedTables
    with FutureSupport
    with GivenWhenThen
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val objectUnderTest = new SlickTermsAndConditionsRepository(dbConfig)

  "Punter T&Cs repository" should {
    val initialTerms = Terms(CurrentTermsVersion(0), TermsContent("terms0"), TermsDaysThreshold(100))
    val updatedTerms = Terms(CurrentTermsVersion(1), TermsContent("terms1"), TermsDaysThreshold(100))

    "terms should update correctly" in withTruncatedTables {
      Given("initial terms set")
      awaitRight(objectUnderTest.insert(initialTerms))
      val initialTermsSet = await(objectUnderTest.getCurrentTerms())

      When("terms updated")
      awaitRight(objectUnderTest.insert(updatedTerms))

      Then("the current terms should be the updated version")
      val updatedTermsSet = await(objectUnderTest.getCurrentTerms())

      initialTermsSet shouldBe initialTerms
      updatedTermsSet shouldBe updatedTerms
    }

    "terms version should not already exist" in withTruncatedTables {
      Given("initial terms set")
      awaitRight(objectUnderTest.insert(initialTerms))

      When("terms updated with same version")
      val failingNewTerms = Terms(CurrentTermsVersion(0), TermsContent("badbad yuyu"), TermsDaysThreshold(100))
      val failure = awaitLeft(objectUnderTest.insert(failingNewTerms))

      Then("the current terms should NOT be updated")
      val shouldNotBeUpdated = await(objectUnderTest.getCurrentTerms())

      failure shouldBe WrongTermsValue
      shouldNotBeUpdated shouldBe initialTerms
    }
  }
}
